"""Pydantic models for the review studio. Mirrored by hand in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

HEX = r"^#[0-9A-Fa-f]{6}$"
SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


class Stamped(BaseModel):
    created_at: datetime = Field(default_factory=_now)

    @field_validator("created_at")
    @classmethod
    def _aware(cls, v: datetime) -> datetime:  # motor returns naive UTC datetimes
        return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


# ---------- Restaurant ----------
class Theme(BaseModel):
    accent: str = Field("#EA580C", pattern=HEX)
    background: str = Field("#FDFBF7", pattern=HEX)
    card: str = Field("#FFFFFF", pattern=HEX)
    font: Literal["inter", "plus-jakarta", "poppins", "system"] = "plus-jakarta"
    spacing: Literal["compact", "comfortable", "spacious"] = "comfortable"
    shape: Literal["pill", "rounded", "square"] = "pill"


class RewardConfig(BaseModel):
    enabled: bool = True
    title: str = Field("10% off your next visit", min_length=1, max_length=80)
    details: str = Field("Show this code to your server on your next visit.", max_length=240)
    sorry_title: str = Field("A free dessert, on us", min_length=1, max_length=80)
    valid_days: int = Field(30, ge=1, le=365)
    weekly_prize: str = Field("Free meal for two", min_length=1, max_length=80)


class PublicReward(BaseModel):
    enabled: bool
    title: str
    details: str
    sorry_title: str
    valid_days: int


class MenuItem(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str = Field(min_length=1, max_length=60)


class MenuItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class Restaurant(Stamped):
    id: str = Field(default_factory=_uid)
    slug: str = Field(pattern=SLUG, max_length=60)
    slug_aliases: List[str] = []  # earlier link names; they keep redirecting to the current slug
    name: str = Field(min_length=1, max_length=80)
    location: str = ""
    google_place_id: str = ""
    whatsapp_number: str = ""
    otp_enabled: bool = True
    menu: List[MenuItem] = []
    existing_reviews: str = ""
    theme: Theme = Field(default_factory=Theme)
    reward: RewardConfig = Field(default_factory=RewardConfig)


class RestaurantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    location: str = ""
    slug: Optional[str] = Field(None, pattern=SLUG, max_length=60)


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    slug: Optional[str] = Field(None, pattern=SLUG, max_length=60)
    location: Optional[str] = None
    google_place_id: Optional[str] = None
    whatsapp_number: Optional[str] = None
    otp_enabled: Optional[bool] = None
    existing_reviews: Optional[str] = Field(None, max_length=50000)
    theme: Optional[Theme] = None
    reward: Optional[RewardConfig] = None


class PublicRestaurant(BaseModel):
    id: str
    slug: str
    name: str
    location: str
    menu: List[str]
    theme: Theme
    otp_enabled: bool
    otp_available: bool
    whatsapp_enabled: bool
    sms_demo: bool
    whatsapp_delivery: bool
    google_review_url: str
    reward: PublicReward


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class Me(BaseModel):
    id: str
    email: str
    platform_role: Optional[str] = None
    restaurant_ids: List[str] = []


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class OwnerOut(Stamped):
    id: str
    email: str


class OwnerCreate(BaseModel):
    email: str = Field(min_length=3, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=200)


# ---------- Guest flow ----------
class VisitIn(BaseModel):
    rating: int = Field(ge=1, le=5)


class VisitOut(BaseModel):
    id: str


Tone = Literal["foodie", "crisp", "desi"]


class DraftRequest(BaseModel):
    rating: int = Field(ge=4, le=5)
    dishes: List[str] = []
    vibes: List[str] = []
    note: str = Field("", max_length=1000)
    tone: Tone = "foodie"

    @model_validator(mode="after")
    def _needs_something(self):
        if not self.dishes and not self.vibes:
            raise ValueError("Pick at least one dish or vibe")
        return self


class DraftResponse(BaseModel):
    text: str
    tone: Tone
    tone_label: str
    source: str = "ai"  # "ai" | "offline"
    rewrites: int = 0


ContactMethod = Literal["sms_verified", "whatsapp_pending", "unverified"]


class ReviewLogCreate(BaseModel):
    rating: int = Field(ge=4, le=5)
    dishes: List[str] = []
    vibes: List[str] = []
    ai_draft: str = Field("", max_length=4000)
    final_text: str = Field(min_length=1, max_length=4000)
    draft_style: Optional[str] = None
    contact_name: Optional[str] = Field(None, max_length=80)
    contact_phone: Optional[str] = Field(None, max_length=20)
    verification_id: Optional[str] = None
    client_id: Optional[str] = Field(None, max_length=64)


class ReviewLog(Stamped):
    id: str = Field(default_factory=_uid)
    restaurant_id: str
    rating: int
    dishes: List[str] = []
    vibes: List[str] = []
    ai_draft: str = ""
    final_text: str
    draft_style: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_method: Optional[ContactMethod] = None
    client_id: Optional[str] = None


class CrmFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=3)
    message: str = Field(min_length=1, max_length=2000)
    issues: List[str] = []
    client_id: Optional[str] = None
    created_offline: bool = False


FeedbackStatus = Literal["new", "resolved"]


class CrmFeedback(Stamped):
    id: str = Field(default_factory=_uid)
    restaurant_id: str
    rating: int
    message: str
    issues: List[str] = []
    client_id: Optional[str] = None
    created_offline: bool = False
    status: FeedbackStatus = "new"
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None


class FeedbackStatusIn(BaseModel):
    status: FeedbackStatus


class DishCount(BaseModel):
    name: str
    count: int


class Analytics(BaseModel):
    total_reviews: int
    total_visits: int
    conversion_rate: float
    top_dishes: List[DishCount]
    open_feedback: int


class OtpSendIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class OtpSendOut(BaseModel):
    sent: bool
    available: bool
    phone: str
    demo_code: Optional[str] = None  # only set by the demo (mock) SMS adapter


class OtpCheckIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    code: str = Field(min_length=4, max_length=10)


class OtpCheckOut(BaseModel):
    verified: bool
    verification_id: Optional[str] = None


class WhatsappIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    name: str = Field("", max_length=80)


class WhatsappOut(BaseModel):
    link: str
    code: str
    verification_id: str


# ---------- Rewards (scratch card) ----------
RewardSource = Literal["review", "feedback", "leaderboard"]
GuestSource = Literal["review", "feedback"]
WhatsappStatus = Literal["sent", "failed", "not_configured"]


class RewardClaimIn(BaseModel):
    name: str = Field("", max_length=80)
    phone: str = Field(min_length=10, max_length=20)
    verification_id: Optional[str] = None
    source: GuestSource = "review"
    ref_client_id: Optional[str] = Field(None, max_length=64)
    coins: int = Field(0, ge=0, le=400)  # coins shown in the guest HUD; feeds the owner-only weekly leaderboard


class RewardClaim(Stamped):
    id: str = Field(default_factory=_uid)
    restaurant_id: str
    code: str
    title: str
    details: str
    source: RewardSource
    contact_name: Optional[str] = None
    contact_phone: str
    contact_method: ContactMethod
    ref_client_id: Optional[str] = None
    expires_at: datetime
    redeemed_at: Optional[datetime] = None
    week_start: Optional[str] = None  # leaderboard prizes: the week (YYYY-MM-DD, Monday) it was awarded for
    whatsapp_status: Optional[WhatsappStatus] = None
    whatsapp_error: Optional[str] = None

    @field_validator("expires_at", "redeemed_at")
    @classmethod
    def _aware_dates(cls, v: Optional[datetime]) -> Optional[datetime]:
        return v.replace(tzinfo=timezone.utc) if v is not None and v.tzinfo is None else v


# ---------- Weekly leaderboard (owner-only) ----------
class LeaderEntry(BaseModel):
    rank: int
    name: Optional[str] = None
    phone: str
    coins: int
    runs: int


class Leaderboard(BaseModel):
    week_start: str  # YYYY-MM-DD (Monday, APP_TZ)
    week_end: str  # YYYY-MM-DD (Sunday)
    weeks_ago: int
    prize_title: str
    entries: List[LeaderEntry]
    award: Optional[RewardClaim] = None


class AwardIn(BaseModel):
    weeks_ago: int = Field(0, ge=0, le=12)


class SlugCheck(BaseModel):
    slug: str  # normalized form of what was typed
    available: bool
    current: bool  # it's this restaurant's link right now
    reason: Optional[str] = None
    suggestions: List[str] = []
