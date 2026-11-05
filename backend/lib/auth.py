"""In-house email+password sessions (httpOnly JWT cookie) and the authorization helpers.

Two role scopes, never collapsed:
  - platform scope: users.platform_role == "superadmin" -> every restaurant
  - tenant scope:   users.restaurant_ids (owner memberships) -> only those restaurants
The user is re-read from Mongo on every request, so removed memberships / password resets apply immediately.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response

from lib.db import db

COOKIE = "rs_session"
SESSION_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def set_session(response: Response, user: dict) -> None:
    claims = {
        "sub": user["id"],
        "ver": user.get("session_version", 0),
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    }
    token = jwt.encode(claims, os.environ["JWT_SECRET"], algorithm="HS256")
    response.set_cookie(
        COOKIE, token, httponly=True, secure=True, samesite="lax", max_age=SESSION_DAYS * 86400, path="/"
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/", secure=True, samesite="lax")


async def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    try:
        claims = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"id": claims.get("sub")}, {"_id": 0})
    if not user or user.get("session_version", 0) != claims.get("ver"):
        raise HTTPException(status_code=401, detail="Session expired")
    return user


def is_super(user: dict) -> bool:
    return user.get("platform_role") == "superadmin"


async def require_super(user: dict = Depends(current_user)) -> dict:
    if not is_super(user):
        raise HTTPException(status_code=403, detail="Not allowed")
    return user


def restaurant_scope(user: dict) -> dict:
    """Mongo predicate for the restaurants this principal may see (folded into every list query)."""
    return {} if is_super(user) else {"id": {"$in": user.get("restaurant_ids", [])}}


async def accessible_restaurant(rid: str, user: dict = Depends(current_user)) -> dict:
    """Tenant gate for every /admin/restaurants/{rid}/... route. Not visible -> 404 (never 403)."""
    # $and, never a dict merge: both predicates are on "id", and merging would drop the requested rid.
    doc = await db.restaurants.find_one({"$and": [{"id": rid}, restaurant_scope(user)]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return doc
