"""Outbound WhatsApp reward delivery. Pick a sender with WHATSAPP_SENDER:
  auto (default) -> meta_cloud when WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID exist, otherwise disabled
  meta_cloud     -> Meta WhatsApp Business Cloud API, approved template message (httpx, no SDK)
  disabled       -> nothing is sent; claims record whatsapp_status="not_configured"
Add another BSP (Gupshup, Interakt, Twilio WhatsApp…) by writing a class with name/available/send and registering it.
"""

import os
from dataclasses import dataclass
from typing import Protocol

import httpx


class MessagingError(Exception):
    def __init__(self, message: str, code: str = ""):
        super().__init__(message)
        self.code = code


@dataclass
class RewardMessage:
    phone: str  # E.164
    name: str
    title: str
    code: str
    expires: str  # human date, e.g. "5 Dec 2026"


class RewardMessenger(Protocol):
    name: str

    def available(self) -> bool: ...
    async def send(self, msg: RewardMessage) -> str: ...  # returns provider message id


# Meta error codes -> guest/owner-readable reasons
_META_ERRORS = {
    "131026": "This number isn't on WhatsApp",
    "131047": "WhatsApp window expired; an approved template is required",
    "132000": "Template variables don't match (needs 4: name, reward, code, expiry)",
    "132001": "Template name or language isn't approved",
    "132015": "Template is paused",
    "132016": "Template is disabled",
    "190": "WhatsApp access token is invalid or expired",
    "10": "WhatsApp token is missing messaging permission",
}


class MetaCloudWhatsApp:
    name = "meta_cloud"

    def __init__(self) -> None:
        self.token = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
        self.phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
        self.version = os.environ.get("META_GRAPH_VERSION", "v23.0")
        self.template = os.environ.get("WHATSAPP_TEMPLATE_NAME", "restaurant_reward_issued")
        self.language = os.environ.get("WHATSAPP_TEMPLATE_LANGUAGE", "en_US")

    def available(self) -> bool:
        return bool(self.token and self.phone_number_id)

    async def send(self, msg: RewardMessage) -> str:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": msg.phone,
            "type": "template",
            "template": {
                "name": self.template,
                "language": {"code": self.language},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": msg.name or "there"},
                            {"type": "text", "text": msg.title},
                            {"type": "text", "text": msg.code},
                            {"type": "text", "text": msg.expires},
                        ],
                    }
                ],
            },
        }
        url = f"https://graph.facebook.com/{self.version}/{self.phone_number_id}/messages"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.post(url, json=payload, headers={"Authorization": f"Bearer {self.token}"})
        except httpx.HTTPError as exc:
            raise MessagingError(f"WhatsApp unreachable: {exc.__class__.__name__}")
        try:
            body = res.json()
        except ValueError:
            body = {}
        if res.is_error:
            err = body.get("error", {}) if isinstance(body, dict) else {}
            code = str(err.get("code", res.status_code))
            raise MessagingError(_META_ERRORS.get(code, f"WhatsApp rejected the message ({code})"), code)
        return str((body.get("messages") or [{}])[0].get("id", ""))


class DisabledMessenger:
    name = "disabled"

    def available(self) -> bool:
        return False

    async def send(self, msg: RewardMessage) -> str:
        raise MessagingError("WhatsApp delivery isn't set up")


_SENDERS = {"meta_cloud": MetaCloudWhatsApp, "disabled": DisabledMessenger}


def get_reward_messenger() -> RewardMessenger:
    key = os.environ.get("WHATSAPP_SENDER", "auto")
    if key == "auto":
        meta = MetaCloudWhatsApp()
        return meta if meta.available() else DisabledMessenger()
    return _SENDERS[key]()
