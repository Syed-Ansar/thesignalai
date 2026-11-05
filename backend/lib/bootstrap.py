"""Idempotent startup seed: super-admin, demo owner, Kaka (default) + Mana sample restaurants.
Uses $setOnInsert so admin edits are never overwritten."""

import logging
import os
import uuid
from datetime import datetime, timezone

from lib.auth import hash_password
from lib.db import db

logger = logging.getLogger(__name__)

KAKA_ID = "rest-kaka"
MANA_ID = "rest-mana"


def _menu(names: list[str]) -> list[dict]:
    return [{"id": str(uuid.uuid4()), "name": n} for n in names]


RESTAURANTS = [
    {
        "id": KAKA_ID,
        "slug": "kaka-restaurant",
        "name": "Kaka Restaurant",
        "location": "Hyderabad",
        "google_place_id": "",
        "whatsapp_number": "",
        "otp_enabled": True,
        "menu": _menu(["Kaka Special Biryani", "Chicken 65", "Mutton Haleem", "Double Ka Meetha"]),
        "existing_reviews": "",
        "theme": {"accent": "#EA580C", "background": "#FDFBF7", "card": "#FFFFFF", "font": "plus-jakarta", "spacing": "comfortable", "shape": "pill"},
    },
    {
        "id": MANA_ID,
        "slug": "mana-restaurant",
        "name": "Mana Restaurant",
        "location": "Shankarpally",
        "google_place_id": "",
        "whatsapp_number": "",
        "otp_enabled": True,
        "menu": _menu(["Special Chicken Biryani", "Paneer Tikka", "Butter Naan"]),
        "existing_reviews": "",
        "theme": {"accent": "#B45309", "background": "#FFFBEB", "card": "#FFFFFF", "font": "poppins", "spacing": "comfortable", "shape": "rounded"},
    },
]


async def _ensure_user(email: str, password: str, platform_role: str | None, restaurant_ids: list[str]) -> None:
    await db.users.update_one(
        {"email": email.lower()},
        {
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "email": email.lower(),
                "password_hash": hash_password(password),
                "platform_role": platform_role,
                "restaurant_ids": restaurant_ids,
                "session_version": 0,
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


async def bootstrap() -> None:
    try:
        now = datetime.now(timezone.utc)
        for r in RESTAURANTS:
            await db.restaurants.update_one({"id": r["id"]}, {"$setOnInsert": {**r, "created_at": now}}, upsert=True)
        await _ensure_user(
            os.environ.get("SUPERADMIN_EMAIL", "admin@reviewstudio.app"),
            os.environ.get("SUPERADMIN_PASSWORD", "Studio@2026"),
            "superadmin",
            [],
        )
        await _ensure_user("owner@kaka.restaurant", "KakaOwner@2026", None, [KAKA_ID])
        # Legacy single-tenant rows from the first build have no restaurant_id; every query filters
        # by restaurant_id, so they are simply never shown (no deletion).
    except Exception as exc:  # never block boot
        logger.error("bootstrap failed: %s", exc)
