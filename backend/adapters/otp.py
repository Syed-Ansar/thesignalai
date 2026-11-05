"""SMS-OTP adapter. Pick a provider with OTP_ADAPTER:
  auto (default)  -> twilio_verify when its keys exist, otherwise demo
  twilio_verify   -> Twilio Verify REST API (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE)
  demo            -> MOCK: no SMS is sent; the code is returned to the guest screen
  disabled        -> no phone verification
Add another provider (MSG91, Gupshup, AWS SNS…) by writing a class with name/demo/available/send/check
and registering it in _ADAPTERS.
"""

import hashlib
import os
import random
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Protocol

import httpx

from lib.db import db


class OtpError(Exception):
    def __init__(self, message: str, code: str = "", status: int = 502):
        super().__init__(message)
        self.code = code
        self.status = status  # HTTP status the API should answer with


# Twilio Verify error codes -> (http status, guest-readable message)
TWILIO_ERRORS = {
    "60200": (422, "That number doesn't look right. Check it and try again."),
    "21211": (422, "That number doesn't look right. Check it and try again."),
    "21608": (422, "This number can't receive codes yet (trial account: verify it in Twilio first)."),
    "60203": (429, "Too many codes sent to this number. Try again in 10 minutes."),
    "60202": (429, "Too many wrong codes. Request a new one in 10 minutes."),
    "60205": (422, "This number can't receive SMS. Try a mobile number."),
    "60410": (422, "SMS to this number is blocked. Try another number."),
}


class OtpAdapter(Protocol):
    name: str
    demo: bool

    def available(self) -> bool: ...
    async def send(self, phone: str) -> Optional[str]: ...  # returns the code only for demo adapters
    async def check(self, phone: str, code: str) -> bool: ...


class TwilioVerifyAdapter:
    name = "twilio_verify"
    demo = False
    BASE = "https://verify.twilio.com/v2/Services"

    def __init__(self) -> None:
        self.sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.service = os.environ.get("TWILIO_VERIFY_SERVICE", "")

    def available(self) -> bool:
        return bool(self.sid and self.token and self.service)

    async def _post(self, path: str, data: dict) -> dict:
        async with httpx.AsyncClient(timeout=15, auth=(self.sid, self.token)) as client:
            res = await client.post(f"{self.BASE}/{self.service}/{path}", data=data)
        if res.status_code >= 400:
            try:
                code = str(res.json().get("code", ""))
            except ValueError:
                code = ""
            status, msg = TWILIO_ERRORS.get(code, (502, "Couldn't send the code right now"))
            if res.status_code == 404:
                status, msg = 404, "Code expired or already used"
            raise OtpError(msg, code=code, status=status)
        return res.json()

    async def send(self, phone: str) -> Optional[str]:
        await self._post("Verifications", {"To": phone, "Channel": "sms"})
        return None

    async def check(self, phone: str, code: str) -> bool:
        try:
            body = await self._post("VerificationCheck", {"To": phone, "Code": code})
        except OtpError as exc:
            if exc.status == 404:  # expired / already used verification
                return False
            raise
        return body.get("status") == "approved"


def _hash(phone: str, code: str) -> str:
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()


class DemoOtpAdapter:
    """MOCKED SMS: generates a real one-time code (10-min expiry, single use) but shows it on screen."""

    name = "demo"
    demo = True
    TTL = timedelta(minutes=10)

    def available(self) -> bool:
        return True

    async def send(self, phone: str) -> Optional[str]:
        code = f"{random.randint(0, 999999):06d}"
        await db.otp_demo_codes.insert_one(
            {"phone": phone, "hash": _hash(phone, code), "used": False, "created_at": datetime.now(timezone.utc)}
        )
        return code

    async def check(self, phone: str, code: str) -> bool:
        since = datetime.now(timezone.utc) - self.TTL
        res = await db.otp_demo_codes.update_one(
            {"phone": phone, "hash": _hash(phone, code), "used": False, "created_at": {"$gte": since}},
            {"$set": {"used": True}},
        )
        return res.modified_count == 1


class DisabledOtpAdapter:
    name = "disabled"
    demo = False

    def available(self) -> bool:
        return False

    async def send(self, phone: str) -> Optional[str]:
        raise OtpError("OTP disabled")

    async def check(self, phone: str, code: str) -> bool:
        return False


_ADAPTERS = {"twilio_verify": TwilioVerifyAdapter, "demo": DemoOtpAdapter, "disabled": DisabledOtpAdapter}


def get_otp_adapter() -> OtpAdapter:
    key = os.environ.get("OTP_ADAPTER", "auto")
    if key == "auto":
        twilio = TwilioVerifyAdapter()
        return twilio if twilio.available() else DemoOtpAdapter()
    return _ADAPTERS[key]()


def normalize_phone(raw: str) -> str:
    """E.164 for Indian numbers (+91XXXXXXXXXX); other +country numbers pass through. Raises ValueError."""
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10 and digits[0] in "6789":
        return "+91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return "+" + digits
    if len(digits) == 11 and digits.startswith("0"):
        return "+91" + digits[1:]
    if raw.strip().startswith("+") and 8 <= len(digits) <= 15:
        return "+" + digits
    raise ValueError("Enter a valid 10-digit mobile number")
