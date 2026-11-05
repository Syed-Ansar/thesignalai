import json
import logging
import os
import re
import uuid
from typing import List

from fastapi import APIRouter, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from lib.db import db
from lib.pii import sanitize
from models.review import (
    AppConfig,
    CrmFeedback,
    CrmFeedbackCreate,
    DraftRequest,
    DraftResponse,
    PetpoojaOrder,
)

router = APIRouter()
logger = logging.getLogger(__name__)

RESTAURANT_NAME = "Mana Restaurant"
LOCATION = "Shankarpally"

SYSTEM_PROMPT = """You write Google review drafts for real guests of an Indian restaurant.
Return ONLY a JSON object with keys "option_1", "option_2", "option_3" (string values). No markdown.
- option_1: Short & Direct. 1-2 punchy sentences, max ~30 words.
- option_2: Descriptive & Detailed. 4-6 sentences, specific about dishes, taste, service and ambiance.
- option_3: Warm & Casual Hinglish/English mix (Roman script Hindi words like "ekdum", "bahut", "mast", "zabardast", "paisa vasool"), 2-4 sentences.
Rules:
- Sound like a real local guest from Hyderabad/Telangana, first person, natural and specific.
- NEVER use clichés: "I recently dined at", "I recently visited", "strive for excellence", "culinary journey", "hidden gem", "tantalizing", "delightful experience", "exceeded my expectations", "look no further".
- Only mention what the guest selected; do not invent prices, names of staff, or facts.
- Each option must open differently and vary in rhythm. No hashtags, no emojis overload (max 1 emoji in option_3).
- Do not include phone numbers, emails, or bill numbers."""


@router.get("/config", response_model=AppConfig)
async def get_config():
    place_id = os.environ.get("GOOGLE_PLACE_ID", "YOUR_GOOGLE_PLACE_ID")
    return AppConfig(
        restaurant_name=RESTAURANT_NAME,
        location=LOCATION,
        google_place_id=place_id,
        google_review_url=f"https://search.google.com/local/writereview?placeid={place_id}",
    )


@router.get("/orders/{order_id}", response_model=PetpoojaOrder)
async def get_order(order_id: str):
    doc = await db.petpooja_orders.find_one({"petpooja_order_id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return PetpoojaOrder(**doc)


@router.post("/crm-feedback", response_model=CrmFeedback)
async def create_crm_feedback(payload: CrmFeedbackCreate):
    if payload.client_id:
        existing = await db.crm_feedback.find_one({"client_id": payload.client_id}, {"_id": 0})
        if existing:
            return CrmFeedback(**existing)
    data = payload.model_dump()
    data["message"] = sanitize(data["message"]) or "(details removed for privacy)"
    fb = CrmFeedback(**data)
    await db.crm_feedback.insert_one(fb.model_dump())
    return fb


@router.get("/crm-feedback", response_model=List[CrmFeedback])
async def list_crm_feedback():
    docs = await db.crm_feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [CrmFeedback(**d) for d in docs]


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    return json.loads(match.group(0) if match else raw)


@router.post("/generate-drafts", response_model=DraftResponse)
async def generate_drafts(payload: DraftRequest):
    note = sanitize(payload.note)
    tags = [sanitize(t) for t in payload.tags if t.strip()]
    dishes = [sanitize(d) for d in payload.dishes if d.strip()]
    prompt = (
        f"Restaurant: {RESTAURANT_NAME}, {LOCATION}.\n"
        f"Star rating: {payload.rating}/5.\n"
        f"Guest liked: {', '.join(tags)}.\n"
        f"Dishes ordered: {', '.join(dishes) if dishes else 'not specified'}.\n"
        f"Guest note: {note or 'none'}.\n"
        "Write the 3 drafts now."
    )
    chat = (
        LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"drafts-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPT,
        )
        .with_model("openai", "gpt-4o-mini")
        .with_params(temperature=1.05, top_p=0.95)
    )
    out = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                out += ev.content
            elif isinstance(ev, StreamDone):
                break
        data = _parse_json(out)
        return DraftResponse(
            option_1=sanitize(str(data["option_1"])),
            option_2=sanitize(str(data["option_2"])),
            option_3=sanitize(str(data["option_3"])),
            source="ai",
        )
    except Exception as exc:
        logger.error("generate_drafts failed: %s | raw=%r", exc, out[:300])
        raise HTTPException(status_code=502, detail="Draft generation failed")
