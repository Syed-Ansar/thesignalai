"""Reward helpers shared by the public claim route and admin actions: code generation + WhatsApp delivery."""

import asyncio
import logging
import random
import string
from datetime import datetime, timezone

from adapters.messaging import MessagingError, RewardMessage, get_reward_messenger
from lib.db import db

logger = logging.getLogger(__name__)
_tasks: set = set()  # keep references so background sends aren't garbage-collected


def reward_code(name: str) -> str:
    prefix = "".join(c for c in name.upper() if c.isalpha())[:4] or "GIFT"
    return f"{prefix}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=5))}"


async def deliver_whatsapp(claim: dict) -> dict:
    """Send the reward code by WhatsApp and record the outcome on the claim. Never raises."""
    messenger = get_reward_messenger()
    update: dict = {"whatsapp_at": datetime.now(timezone.utc)}
    if not messenger.available():
        update.update(whatsapp_status="not_configured", whatsapp_error=None)
    else:
        expires = claim["expires_at"]
        msg = RewardMessage(
            phone=claim["contact_phone"],
            name=claim.get("contact_name") or "",
            title=claim["title"],
            code=claim["code"],
            expires=f"{expires.day} {expires.strftime('%b %Y')}",
        )
        try:
            mid = await messenger.send(msg)
            update.update(whatsapp_status="sent", whatsapp_error=None, whatsapp_message_id=mid)
        except MessagingError as exc:
            logger.warning("whatsapp reward send failed (%s): %s", exc.code, exc)
            update.update(whatsapp_status="failed", whatsapp_error=str(exc))
    await db.reward_claims.update_one({"id": claim["id"]}, {"$set": update})
    return {**claim, **update}


def deliver_in_background(claim: dict) -> None:
    task = asyncio.create_task(deliver_whatsapp(claim))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
