"""Guest link names (slugs): validation, availability and suggestions.

A restaurant answers on its current slug, its id, and every slug it used before (slug_aliases),
so changing the link never breaks printed QR posters. None of these can be taken by another restaurant."""

import re
from typing import List, Optional

from lib.db import db
from models.studio import SlugCheck

RESERVED = {"admin", "api", "app", "assets", "static", "sw", "manifest", "favicon", "login", "www", "help"}
MIN_LEN, MAX_LEN = 3, 40
_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize(raw: str) -> str:
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9-]+", "-", raw.strip().lower())).strip("-")


def problem(slug: str) -> Optional[str]:
    if len(slug) < MIN_LEN:
        return f"Use at least {MIN_LEN} characters"
    if len(slug) > MAX_LEN:
        return f"Keep it under {MAX_LEN} characters"
    if not _PATTERN.match(slug):
        return "Only letters, numbers and single dashes"
    if slug in RESERVED:
        return "That name is reserved by the app"
    return None


async def owner_of(slug: str) -> Optional[dict]:
    return await db.restaurants.find_one(
        {"$or": [{"slug": slug}, {"id": slug}, {"slug_aliases": slug}]}, {"_id": 0, "id": 1, "slug": 1}
    )


async def is_free(slug: str, restaurant_id: Optional[str] = None) -> bool:
    if problem(slug):
        return False
    owner = await owner_of(slug)
    return owner is None or owner["id"] == restaurant_id


async def _suggest(base: str, location: str, restaurant_id: Optional[str]) -> List[str]:
    root = base[:MAX_LEN - 4].strip("-") or "eat"
    loc = normalize(location).split("-")[0] if location else ""
    first = root.split("-")[0]
    candidates = [f"{first}-{loc}" if loc else "", f"{root}-{loc}" if loc else "", f"eat-{first}", f"{first}-kitchen"]
    candidates += [f"{root}{n}" for n in range(1, 10)]
    out: List[str] = []
    for c in candidates:
        c = normalize(c)
        if c and c != base and c not in out and await is_free(c, restaurant_id):
            out.append(c)
        if len(out) == 3:
            break
    return out


async def check(raw: str, restaurant_id: Optional[str] = None) -> SlugCheck:
    slug = normalize(raw)
    reason = problem(slug)
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0, "slug": 1, "location": 1}) if restaurant_id else None
    if not reason:
        owner = await owner_of(slug)
        if owner and owner["id"] != restaurant_id:
            reason = "Already taken by another restaurant"
    available = reason is None
    current = bool(restaurant and restaurant["slug"] == slug)
    suggestions = [] if available else await _suggest(slug or "eat", (restaurant or {}).get("location", ""), restaurant_id)
    return SlugCheck(slug=slug, available=available, current=current, reason=reason, suggestions=suggestions)
