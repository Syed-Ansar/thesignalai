"""Criterion: Theme Studio save & publish updates the theme and the public endpoint reflects it."""

import uuid

from tests.conftest import authed_client

SUPER_EMAIL = "admin@reviewstudio.app"
SUPER_PASSWORD = "Studio@2026"


def test_theme_save_publishes_to_public_endpoint():
    c = authed_client(SUPER_EMAIL, SUPER_PASSWORD)
    try:
        created = c.post(
            "/admin/restaurants",
            json={"name": f"tscheck-theme-{uuid.uuid4().hex[:6]}", "location": "Testville"},
        )
        rid, slug = created.json()["id"], created.json()["slug"]

        new_theme = {
            "accent": "#123456",
            "background": "#FDFBF7",
            "card": "#FFFFFF",
            "font": "inter",
            "spacing": "spacious",
            "shape": "rounded",
        }
        patch = c.patch(f"/admin/restaurants/{rid}", json={"theme": new_theme})
        assert patch.status_code == 200, patch.text
        assert patch.json()["theme"]["accent"] == "#123456"

        pub = c.get(f"/public/restaurants/{slug}")
        assert pub.status_code == 200, pub.text
        theme = pub.json()["theme"]
        assert theme["accent"] == "#123456"
        assert theme["font"] == "inter"
        assert theme["spacing"] == "spacious"
        assert theme["shape"] == "rounded"
    finally:
        c.close()
