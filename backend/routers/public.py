"""Guest-facing API (no login). Everything is addressed by restaurant slug."""

import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from adapters.channels import get_review_destination, get_whatsapp_adapter
from adapters.otp import OtpError, get_otp_adapter, normalize_phone
from lib.db import db
from adapters.messaging import get_reward_messenger
from lib.drafts import generate_unique_draft
from lib.rewards import deliver_in_background, reward_code
from lib.pii import sanitize
from models.studio import (
    CrmFeedback,
    CrmFeedbackCreate,
    DraftRequest,
    DraftResponse,
    OtpCheckIn,
    OtpCheckOut,
    OtpSendIn,
    OtpSendOut,
    PublicRestaurant,
    PublicReward,
    ReviewLog,
    ReviewLogCreate,
    RewardClaim,
    RewardClaimIn,
    RewardConfig,
    VisitIn,
    VisitOut,
    WhatsappIn,
    WhatsappOut,
)

router = APIRouter(prefix="/public")
logger = logging.getLogger(__name__)
OTP_SENDS_PER_10_MIN = 3


async def _restaurant(slug: str) -> dict:
    key = slug.strip().lower()
    doc = await db.restaurants.find_one({"$or": [{"slug": key}, {"id": key}, {"slug_aliases": key}]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return doc


def _phone(raw: str) -> str:
    try:
        return normalize_phone(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


def _verification_required(r: dict) -> bool:
    return r.get("otp_enabled", True) and get_otp_adapter().available()


@router.get("/restaurants/{slug}", response_model=PublicRestaurant)
async def public_restaurant(slug: str):
    r = await _restaurant(slug)
    adapter = get_otp_adapter()
    reward = RewardConfig(**(r.get("reward") or {}))
    return PublicRestaurant(
        id=r["id"],
        slug=r["slug"],
        name=r["name"],
        location=r.get("location", ""),
        menu=[m["name"] for m in r.get("menu", [])],
        theme=r.get("theme") or {},
        otp_enabled=r.get("otp_enabled", True),
        otp_available=_verification_required(r),
        whatsapp_enabled=bool(r.get("whatsapp_number", "").strip()),
        sms_demo=adapter.demo,
        whatsapp_delivery=get_reward_messenger().available(),
        google_review_url=get_review_destination().review_url(r.get("google_place_id", ""), r["name"], r.get("location", "")),
        reward=PublicReward(**reward.model_dump()),
    )


@router.post("/restaurants/{slug}/visits", response_model=VisitOut)
async def log_visit(slug: str, body: VisitIn):
    r = await _restaurant(slug)
    vid = str(uuid.uuid4())
    await db.visits.insert_one({"id": vid, "restaurant_id": r["id"], "rating": body.rating, "created_at": datetime.now(timezone.utc)})
    return VisitOut(id=vid)


@router.post("/restaurants/{slug}/drafts", response_model=DraftResponse)
async def draft(slug: str, body: DraftRequest):
    return await generate_unique_draft(await _restaurant(slug), body)


@router.post("/restaurants/{slug}/reviews", response_model=ReviewLog)
async def log_review(slug: str, body: ReviewLogCreate):
    r = await _restaurant(slug)
    if body.client_id:  # offline re-sync dedupe
        existing = await db.review_logs.find_one({"client_id": body.client_id, "restaurant_id": r["id"]}, {"_id": 0})
        if existing:
            return ReviewLog(**existing)
    phone = _phone(body.contact_phone) if body.contact_phone and body.contact_phone.strip() else None
    method = None
    if phone:
        method = "unverified"
        if body.verification_id:
            v = await db.contact_verifications.find_one(
                {"id": body.verification_id, "restaurant_id": r["id"], "phone": phone}, {"_id": 0}
            )
            if v:
                method = "sms_verified" if v["method"] == "sms" else "whatsapp_pending"
    log = ReviewLog(
        restaurant_id=r["id"],
        rating=body.rating,
        dishes=body.dishes,
        vibes=body.vibes,
        ai_draft=body.ai_draft,
        final_text=body.final_text,
        draft_style=body.draft_style,
        contact_name=(body.contact_name or "").strip() or None,
        contact_phone=phone,
        contact_method=method,
        client_id=body.client_id,
    )
    await db.review_logs.insert_one(log.model_dump())
    return log


@router.post("/restaurants/{slug}/feedback", response_model=CrmFeedback)
async def submit_feedback(slug: str, body: CrmFeedbackCreate):
    r = await _restaurant(slug)
    if body.client_id:  # offline re-sync dedupe
        existing = await db.crm_feedback.find_one({"client_id": body.client_id, "restaurant_id": r["id"]}, {"_id": 0})
        if existing:
            return CrmFeedback(**existing)
    data = body.model_dump()
    data["message"] = sanitize(data["message"]) or "(details removed for privacy)"
    fb = CrmFeedback(restaurant_id=r["id"], **data)
    await db.crm_feedback.insert_one(fb.model_dump())
    return fb


@router.post("/restaurants/{slug}/otp/send", response_model=OtpSendOut)
async def otp_send(slug: str, body: OtpSendIn):
    r = await _restaurant(slug)
    phone = _phone(body.phone)
    adapter = get_otp_adapter()
    if not r.get("otp_enabled", True) or not adapter.available():
        return OtpSendOut(sent=False, available=False, phone=phone)
    since = datetime.now(timezone.utc) - timedelta(minutes=10)
    if await db.otp_sends.count_documents({"phone": phone, "created_at": {"$gte": since}}) >= OTP_SENDS_PER_10_MIN:
        raise HTTPException(status_code=429, detail="Too many codes requested. Try again in a few minutes.")
    try:
        demo_code = await adapter.send(phone)
    except OtpError as exc:
        logger.error("otp send failed (%s): %s", exc.code, exc)
        raise HTTPException(status_code=exc.status, detail=str(exc))
    await db.otp_sends.insert_one({"phone": phone, "restaurant_id": r["id"], "provider": adapter.name, "created_at": datetime.now(timezone.utc)})
    return OtpSendOut(sent=True, available=True, phone=phone, demo_code=demo_code)


@router.post("/restaurants/{slug}/otp/check", response_model=OtpCheckOut)
async def otp_check(slug: str, body: OtpCheckIn):
    r = await _restaurant(slug)
    phone = _phone(body.phone)
    try:
        ok = await get_otp_adapter().check(phone, body.code.strip())
    except OtpError as exc:
        logger.error("otp check failed (%s): %s", exc.code, exc)
        raise HTTPException(status_code=exc.status, detail=str(exc))
    if not ok:
        return OtpCheckOut(verified=False)
    vid = str(uuid.uuid4())
    await db.contact_verifications.insert_one(
        {"id": vid, "restaurant_id": r["id"], "phone": phone, "method": "sms", "created_at": datetime.now(timezone.utc)}
    )
    return OtpCheckOut(verified=True, verification_id=vid)


@router.post("/restaurants/{slug}/whatsapp", response_model=WhatsappOut)
async def whatsapp_verify(slug: str, body: WhatsappIn):
    r = await _restaurant(slug)
    if not r.get("whatsapp_number", "").strip():
        raise HTTPException(status_code=400, detail="WhatsApp verification isn't set up for this restaurant")
    phone = _phone(body.phone)
    code = f"{random.randint(0, 9999):04d}"
    vid = str(uuid.uuid4())
    await db.contact_verifications.insert_one(
        {"id": vid, "restaurant_id": r["id"], "phone": phone, "method": "whatsapp", "status": "pending",
         "code": code, "name": body.name.strip(), "created_at": datetime.now(timezone.utc)}
    )
    msg = f"Hi {r['name']}! Verifying my number for updates & rewards. Session code: RV-{code}"
    return WhatsappOut(link=get_whatsapp_adapter().build_link(r["whatsapp_number"], msg), code=f"RV-{code}", verification_id=vid)


@router.post("/restaurants/{slug}/rewards/claim", response_model=RewardClaim)
async def claim_reward(slug: str, body: RewardClaimIn):
    """Scratch-card reward. Needs a verified phone when SMS verification is on for this restaurant.
    One open (unredeemed, unexpired) reward per phone per restaurant: a repeat claim returns the same card."""
    r = await _restaurant(slug)
    cfg = RewardConfig(**(r.get("reward") or {}))
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="No reward is running right now")
    phone = _phone(body.phone)
    method = "unverified"
    if body.verification_id:
        v = await db.contact_verifications.find_one({"id": body.verification_id, "restaurant_id": r["id"], "phone": phone}, {"_id": 0})
        if v:
            method = "sms_verified" if v["method"] == "sms" else "whatsapp_pending"
    if _verification_required(r) and method == "unverified":
        raise HTTPException(status_code=403, detail="Verify your number to unlock the reward")

    now = datetime.now(timezone.utc)
    name = body.name.strip() or None
    # Every finished run counts toward the weekly leaderboard (deduped per review/feedback).
    if not body.ref_client_id or not await db.guest_runs.find_one({"restaurant_id": r["id"], "ref_client_id": body.ref_client_id}, {"_id": 1}):
        await db.guest_runs.insert_one(
            {"id": str(uuid.uuid4()), "restaurant_id": r["id"], "phone": phone, "name": name, "coins": body.coins,
             "source": body.source, "ref_client_id": body.ref_client_id, "contact_method": method, "created_at": now}
        )
    existing = await db.reward_claims.find_one(
        {"restaurant_id": r["id"], "contact_phone": phone, "redeemed_at": None, "expires_at": {"$gt": now},
         "source": {"$in": ["review", "feedback"]}},
        {"_id": 0},
    )
    if existing:
        return RewardClaim(**existing)

    claim = RewardClaim(
        restaurant_id=r["id"],
        code=reward_code(r["name"]),
        title=cfg.sorry_title if body.source == "feedback" else cfg.title,
        details=cfg.details,
        source=body.source,
        contact_name=name,
        contact_phone=phone,
        contact_method=method,
        ref_client_id=body.ref_client_id,
        expires_at=now + timedelta(days=cfg.valid_days),
    )
    await db.reward_claims.insert_one(claim.model_dump())
    if body.ref_client_id:  # attach the guest's contact to the review / private feedback they just left
        coll = db.review_logs if body.source == "review" else db.crm_feedback
        update = {"contact_name": name, "contact_phone": phone}
        if body.source == "review":
            update["contact_method"] = method
        await coll.update_one({"restaurant_id": r["id"], "client_id": body.ref_client_id}, {"$set": update})
    deliver_in_background(claim.model_dump())
    return claim
