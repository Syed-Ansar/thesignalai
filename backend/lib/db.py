"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
        IndexModel([("restaurant_ids", ASCENDING)], name="restaurant_ids"),
    ],
    "restaurants": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("slug", ASCENDING)], name="slug", unique=True),
    ],
    "visits": [IndexModel([("restaurant_id", ASCENDING), ("created_at", DESCENDING)], name="rest_created")],
    "review_logs": [IndexModel([("restaurant_id", ASCENDING), ("created_at", DESCENDING)], name="rest_created")],
    "crm_feedback": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("client_id", ASCENDING)], name="client_id"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("restaurant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], name="rest_status_created"),
    ],
    "contact_verifications": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "otp_sends": [IndexModel([("phone", ASCENDING), ("created_at", DESCENDING)], name="phone_created")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
