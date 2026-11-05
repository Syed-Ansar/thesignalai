from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import clear_session, current_user, hash_password, set_session, verify_password
from lib.db import db
from models.studio import LoginIn, Me, PasswordChangeIn

router = APIRouter(prefix="/auth")


def to_me(user: dict) -> Me:
    return Me(
        id=user["id"],
        email=user["email"],
        platform_role=user.get("platform_role"),
        restaurant_ids=user.get("restaurant_ids", []),
    )


@router.post("/login", response_model=Me)
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.strip().lower()}, {"_id": 0})
    if not user or user.get("disabled") or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    set_session(response, user)
    return to_me(user)


@router.post("/logout")
async def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@router.get("/me", response_model=Me)
async def me(user: dict = Depends(current_user)):
    return to_me(user)


@router.post("/change-password", response_model=Me)
async def change_password(body: PasswordChangeIn, response: Response, user: dict = Depends(current_user)):
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is wrong")
    version = user.get("session_version", 0) + 1  # signs out every other device
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password), "session_version": version}}
    )
    user["session_version"] = version
    set_session(response, user)
    return to_me(user)
