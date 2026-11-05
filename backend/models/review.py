import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


class AppConfig(BaseModel):
    restaurant_name: str
    location: str
    google_place_id: str
    google_review_url: str


class PetpoojaOrderItem(BaseModel):
    itemid: str
    itemname: str
    category: str


class PetpoojaOrder(BaseModel):
    petpooja_order_id: str
    restaurant_name: str
    location: str
    order_items: List[PetpoojaOrderItem]


class CrmFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=3)
    message: str = Field(min_length=1, max_length=2000)
    issues: List[str] = []
    order_id: Optional[str] = None
    client_id: Optional[str] = None  # client-generated id, dedupes offline re-syncs
    created_offline: bool = False


class CrmFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rating: int
    message: str
    issues: List[str] = []
    order_id: Optional[str] = None
    client_id: Optional[str] = None
    created_offline: bool = False
    status: str = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DraftRequest(BaseModel):
    rating: int = Field(ge=4, le=5)
    tags: List[str] = Field(min_length=1)
    note: str = ""
    dishes: List[str] = []
    order_id: Optional[str] = None


class DraftResponse(BaseModel):
    option_1: str
    option_2: str
    option_3: str
    source: str = "ai"
