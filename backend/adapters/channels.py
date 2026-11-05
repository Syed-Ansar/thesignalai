"""Small outbound-link adapters: WhatsApp verification link and the review destination."""

import os
import re
from urllib.parse import quote, quote_plus


class WaMeLinkAdapter:
    """Phase 1: opens a wa.me chat with a pre-filled message. Confirmation needs a Cloud API adapter (Phase 2)."""

    def build_link(self, business_number: str, message: str) -> str:
        digits = re.sub(r"\D", "", business_number)
        if len(digits) == 10:
            digits = "91" + digits
        return f"https://wa.me/{digits}?text={quote(message)}"


class GoogleReviewDestination:
    def review_url(self, place_id: str, name: str, location: str) -> str:
        if place_id.strip():
            return f"https://search.google.com/local/writereview?placeid={quote_plus(place_id.strip())}"
        return f"https://www.google.com/search?q={quote_plus(f'{name} {location} reviews'.strip())}"


_WA = {"wa_me": WaMeLinkAdapter}
_DEST = {"google": GoogleReviewDestination}


def get_whatsapp_adapter() -> WaMeLinkAdapter:
    return _WA[os.environ.get("WHATSAPP_ADAPTER", "wa_me")]()


def get_review_destination() -> GoogleReviewDestination:
    return _DEST[os.environ.get("REVIEW_DESTINATION", "google")]()
