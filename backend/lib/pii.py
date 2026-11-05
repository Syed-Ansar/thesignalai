"""PII scrubbing — mirrors frontend/src/lib/pii.ts. Applied server-side too as defense in depth."""

import re

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{4}[\s-]?\d{5}(?!\d)")
BILL_RE = re.compile(
    r"\b(?:bill|invoice|inv|order|receipt|kot)\s*(?:no\.?|number|num|#|id)?\s*[:#-]?\s*[A-Za-z]*[-_]?\d{3,}\b",
    re.IGNORECASE,
)
LONG_DIGITS_RE = re.compile(r"\b\d{6,}\b")


def sanitize(text: str) -> str:
    text = EMAIL_RE.sub("", text)
    text = PHONE_RE.sub("", text)
    text = BILL_RE.sub("", text)
    text = LONG_DIGITS_RE.sub("", text)
    return re.sub(r"\s{2,}", " ", text).strip()
