"""Admin studio API. Every route is tenant-gated: accessible_restaurant (404 if not visible),
require_super for platform-scope actions (403). Queries always filter by the gated restaurant id."""

import re
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import accessible_restaurant, current_user, hash_password, require_super, restaurant_scope
from lib.db import db
from models.studio import (
    Analytics,
    CrmFeedback,
    DishCount,
    FeedbackStatus,
    FeedbackStatusIn,
    MenuItem,
    MenuItemIn,
    OwnerCreate,
    OwnerOut,
    Restaurant,
    RestaurantCreate,
    RestaurantUpdate,
    ReviewLog,
    RewardClaim,
)

router = APIRouter(prefix="/admin")


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60] or "restaurant"


async def _slug_taken(slug: str, exclude_id: Optional[str] = None) -> bool:
    q: dict = {"slug": slug}
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    return await db.restaurants.find_one(q, {"_id": 1}) is not None


# ---------- restaurants ----------
@router.get("/restaurants", response_model=List[Restaurant])
async def list_restaurants(user: dict = Depends(current_user)):
    docs = await db.restaurants.find(restaurant_scope(user), {"_id": 0}).sort("created_at", 1).to_list(500)
    return [Restaurant(**d) for d in docs]


@router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(body: RestaurantCreate, _: dict = Depends(require_super)):
    slug = body.slug or slugify(body.name)
    if await _slug_taken(slug):
        if body.slug:
            raise HTTPException(status_code=409, detail="That link slug is already used")
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    r = Restaurant(name=body.name.strip(), location=body.location.strip(), slug=slug)
    await db.restaurants.insert_one(r.model_dump())
    return r


@router.get("/restaurants/{rid}", response_model=Restaurant)
async def get_restaurant(restaurant: dict = Depends(accessible_restaurant)):
    return Restaurant(**restaurant)


@router.patch("/restaurants/{rid}", response_model=Restaurant)
async def update_restaurant(body: RestaurantUpdate, restaurant: dict = Depends(accessible_restaurant)):
    changes = body.model_dump(exclude_none=True)  # whitelisted fields only
    if "slug" in changes and await _slug_taken(changes["slug"], restaurant["id"]):
        raise HTTPException(status_code=409, detail="That link slug is already used")
    for k in ("name", "location", "google_place_id", "whatsapp_number"):
        if k in changes:
            changes[k] = changes[k].strip()
    if changes:
        await db.restaurants.update_one({"id": restaurant["id"]}, {"$set": changes})
    doc = await db.restaurants.find_one({"id": restaurant["id"]}, {"_id": 0})
    return Restaurant(**doc)


# ---------- menu ----------
@router.post("/restaurants/{rid}/menu", response_model=Restaurant)
async def add_menu_item(body: MenuItemIn, restaurant: dict = Depends(accessible_restaurant)):
    item = MenuItem(name=body.name.strip())
    await db.restaurants.update_one({"id": restaurant["id"]}, {"$push": {"menu": item.model_dump()}})
    return Restaurant(**await db.restaurants.find_one({"id": restaurant["id"]}, {"_id": 0}))


@router.patch("/restaurants/{rid}/menu/{item_id}", response_model=Restaurant)
async def edit_menu_item(item_id: str, body: MenuItemIn, restaurant: dict = Depends(accessible_restaurant)):
    res = await db.restaurants.update_one(
        {"id": restaurant["id"], "menu.id": item_id}, {"$set": {"menu.$.name": body.name.strip()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    return Restaurant(**await db.restaurants.find_one({"id": restaurant["id"]}, {"_id": 0}))


@router.delete("/restaurants/{rid}/menu/{item_id}", response_model=Restaurant)
async def delete_menu_item(item_id: str, restaurant: dict = Depends(accessible_restaurant)):
    await db.restaurants.update_one({"id": restaurant["id"]}, {"$pull": {"menu": {"id": item_id}}})
    return Restaurant(**await db.restaurants.find_one({"id": restaurant["id"]}, {"_id": 0}))


# ---------- owners (platform scope) ----------
@router.get("/restaurants/{rid}/owners", response_model=List[OwnerOut])
async def list_owners(restaurant: dict = Depends(accessible_restaurant), _: dict = Depends(require_super)):
    docs = await db.users.find({"restaurant_ids": restaurant["id"], "disabled": {"$ne": True}}, {"_id": 0}).to_list(200)
    return [OwnerOut(**d) for d in docs]


@router.post("/restaurants/{rid}/owners", response_model=OwnerOut)
async def add_owner(body: OwnerCreate, restaurant: dict = Depends(accessible_restaurant), _: dict = Depends(require_super)):
    email = body.email.strip().lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        if existing.get("platform_role") == "superadmin":
            raise HTTPException(status_code=409, detail="That email belongs to the super-admin")
        update: dict = {"$addToSet": {"restaurant_ids": restaurant["id"]}}
        if existing.get("disabled"):  # re-enable a previously removed owner with the new starting password
            update["$set"] = {"disabled": False, "password_hash": hash_password(body.password)}
            update["$inc"] = {"session_version": 1}
        await db.users.update_one({"id": existing["id"]}, update)
        return OwnerOut(**existing)
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "platform_role": None,
        "restaurant_ids": [restaurant["id"]],
        "session_version": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    return OwnerOut(**doc)


@router.delete("/restaurants/{rid}/owners/{user_id}")
async def remove_owner(user_id: str, restaurant: dict = Depends(accessible_restaurant), _: dict = Depends(require_super)):
    user = await db.users.find_one({"id": user_id, "restaurant_ids": restaurant["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Owner not found")
    remaining = [r for r in user.get("restaurant_ids", []) if r != restaurant["id"]]
    # Soft removal: drop the membership, end their sessions; disable the login if no restaurants remain.
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"restaurant_ids": remaining, "disabled": not remaining}, "$inc": {"session_version": 1}},
    )
    return {"ok": True}


# ---------- analytics, logs, feedback ----------
@router.get("/restaurants/{rid}/analytics", response_model=Analytics)
async def analytics(restaurant: dict = Depends(accessible_restaurant)):
    rid = restaurant["id"]
    total_reviews = await db.review_logs.count_documents({"restaurant_id": rid})
    total_visits = await db.visits.count_documents({"restaurant_id": rid})
    open_feedback = await db.crm_feedback.count_documents({"restaurant_id": rid, "status": "new"})
    counter: Counter = Counter()
    async for log in db.review_logs.find({"restaurant_id": rid}, {"_id": 0, "dishes": 1}):
        counter.update(log.get("dishes", []))
    return Analytics(
        total_reviews=total_reviews,
        total_visits=total_visits,
        conversion_rate=round(total_reviews / total_visits, 4) if total_visits else 0.0,
        top_dishes=[DishCount(name=n, count=c) for n, c in counter.most_common(5)],
        open_feedback=open_feedback,
    )


@router.get("/restaurants/{rid}/reviews", response_model=List[ReviewLog])
async def review_logs(restaurant: dict = Depends(accessible_restaurant)):
    docs = await db.review_logs.find({"restaurant_id": restaurant["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ReviewLog(**d) for d in docs]


@router.get("/restaurants/{rid}/feedback", response_model=List[CrmFeedback])
async def feedback(status: Optional[FeedbackStatus] = Query(None), restaurant: dict = Depends(accessible_restaurant)):
    q: dict = {"restaurant_id": restaurant["id"]}
    if status:
        q["status"] = status
    docs = await db.crm_feedback.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [CrmFeedback(**d) for d in docs]


@router.patch("/restaurants/{rid}/feedback/{fid}", response_model=CrmFeedback)
async def set_feedback_status(fid: str, body: FeedbackStatusIn, restaurant: dict = Depends(accessible_restaurant)):
    res = await db.crm_feedback.update_one(
        {"id": fid, "restaurant_id": restaurant["id"]}, {"$set": {"status": body.status}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return CrmFeedback(**await db.crm_feedback.find_one({"id": fid}, {"_id": 0}))


# ---------- rewards ----------
@router.get("/restaurants/{rid}/rewards", response_model=List[RewardClaim])
async def list_rewards(restaurant: dict = Depends(accessible_restaurant)):
    docs = await db.reward_claims.find({"restaurant_id": restaurant["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [RewardClaim(**d) for d in docs]


@router.post("/restaurants/{rid}/rewards/{cid}/redeem", response_model=RewardClaim)
async def redeem_reward(cid: str, restaurant: dict = Depends(accessible_restaurant)):
    doc = await db.reward_claims.find_one({"id": cid, "restaurant_id": restaurant["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Reward not found")
    if doc.get("redeemed_at"):
        raise HTTPException(status_code=409, detail="Already redeemed")
    now = datetime.now(timezone.utc)
    await db.reward_claims.update_one({"id": cid}, {"$set": {"redeemed_at": now}})
    doc["redeemed_at"] = now
    return RewardClaim(**doc)
