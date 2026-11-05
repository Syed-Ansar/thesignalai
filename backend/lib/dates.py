"""Server-side date helpers. The pod clock is UTC — anchor "today" here, never in the browser."""

import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")


def week_bounds(weeks_ago: int = 0, tz: str | None = None) -> tuple[datetime, datetime]:
    """[start, end) of a Monday-start week in `tz` (default APP_TZ), returned as aware datetimes."""
    zone = ZoneInfo(tz or os.environ.get("APP_TZ", "UTC"))
    now = datetime.now(zone)
    start = (now - timedelta(days=now.weekday(), weeks=weeks_ago)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=7)
