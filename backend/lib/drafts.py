"""Draft service: AI writer + PII scrub + uniqueness check against this restaurant's review corpus."""

import asyncio
import logging
import random
import re
from typing import List

from fastapi import HTTPException

from adapters.drafts import TONES, DraftContext, get_draft_writer
from adapters.similarity import get_similarity
from lib.db import db
from lib.pii import sanitize
from models.studio import DraftRequest, DraftResponse

logger = logging.getLogger(__name__)
THRESHOLD = 0.85
MAX_REWRITES = 2


async def review_corpus(restaurant: dict) -> List[str]:
    logs = await db.review_logs.find(
        {"restaurant_id": restaurant["id"]}, {"_id": 0, "final_text": 1}
    ).sort("created_at", -1).to_list(300)
    pasted = [p.strip() for p in re.split(r"\n\s*\n|\n", restaurant.get("existing_reviews", "")) if len(p.strip()) > 15]
    return [l["final_text"] for l in logs if l.get("final_text")] + pasted


def reshuffle(text: str) -> str:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    if len(parts) > 1:
        first, rest = parts[0], parts[1:]
        random.shuffle(rest)
        return " ".join(rest + [first])
    words = text.split(",")
    random.shuffle(words)
    return ",".join(w.strip() for w in words) if len(words) > 1 else text


async def generate_unique_draft(restaurant: dict, req: DraftRequest) -> DraftResponse:
    ctx = DraftContext(
        restaurant=restaurant["name"],
        location=restaurant.get("location", ""),
        rating=req.rating,
        dishes=[sanitize(d) for d in req.dishes if d.strip()],
        vibes=[sanitize(v) for v in req.vibes if v.strip()],
        note=sanitize(req.note),
    )
    writer, sim = get_draft_writer(), get_similarity()
    try:
        text = sanitize(await asyncio.wait_for(writer.write(ctx, req.tone), timeout=25))
    except Exception as exc:
        logger.error("draft writer failed: %s", exc)
        raise HTTPException(status_code=502, detail="Draft generation failed")
    if not text:
        raise HTTPException(status_code=502, detail="Draft generation failed")

    corpus = await review_corpus(restaurant)
    rewrites = 0
    for _ in range(MAX_REWRITES):
        score, match = sim.most_similar(text, corpus)
        if score <= THRESHOLD:
            break
        try:
            text = sanitize(await asyncio.wait_for(writer.rewrite(text, req.tone, ctx, match), timeout=8))
            rewrites += 1
        except Exception as exc:
            logger.warning("rewrite failed: %s", exc)
            break
    if sim.most_similar(text, corpus)[0] > THRESHOLD:
        text = reshuffle(text)
    return DraftResponse(text=text, tone=req.tone, tone_label=TONES[req.tone][0], source="ai", rewrites=rewrites)
