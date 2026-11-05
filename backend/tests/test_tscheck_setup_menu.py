"""Criterion: Setup & Menu tab - owner can edit restaurant fields and manage menu dishes; a
slug conflict with another restaurant is rejected."""

import uuid

import httpx

from tests.conftest import authed_client

SUPER_EMAIL = "admin@reviewstudio.app"
SUPER_PASSWORD = "Studio@2026"


def _super_client() -> httpx.Client:
    return authed_client(SUPER_EMAIL, SUPER_PASSWORD)


def test_setup_edits_persist_and_reflect_on_public_endpoint():
    c = _super_client()
    try:
        created = c.post(
            "/admin/restaurants",
            json={"name": f"tscheck-setup-{uuid.uuid4().hex[:6]}", "location": "Testville"},
        )
        assert created.status_code == 200, created.text
        rid, slug = created.json()["id"], created.json()["slug"]

        place_id = "ChIJtscheckPlace123"
        patch = c.patch(
            f"/admin/restaurants/{rid}",
            json={
                "location": "New Location",
                "google_place_id": place_id,
                "whatsapp_number": "+919876543210",
                "otp_enabled": False,
            },
        )
        assert patch.status_code == 200, patch.text
        assert patch.json()["location"] == "New Location"

        pub = c.get(f"/public/restaurants/{slug}")
        assert pub.status_code == 200, pub.text
        body = pub.json()
        assert body["whatsapp_enabled"] is True
        assert body["google_review_url"] == f"https://search.google.com/local/writereview?placeid={place_id}"
    finally:
        c.close()


def test_menu_add_edit_delete_and_slug_conflict():
    c = _super_client()
    try:
        created = c.post(
            "/admin/restaurants",
            json={"name": f"tscheck-menu-{uuid.uuid4().hex[:6]}", "location": "Testville"},
        )
        rid, slug = created.json()["id"], created.json()["slug"]

        added = c.post(f"/admin/restaurants/{rid}/menu", json={"name": "tscheck-dish"})
        assert added.status_code == 200, added.text
        item = next(m for m in added.json()["menu"] if m["name"] == "tscheck-dish")

        edited = c.patch(f"/admin/restaurants/{rid}/menu/{item['id']}", json={"name": "tscheck-dish-edited"})
        assert edited.status_code == 200, edited.text
        assert any(m["name"] == "tscheck-dish-edited" for m in edited.json()["menu"])

        deleted = c.delete(f"/admin/restaurants/{rid}/menu/{item['id']}")
        assert deleted.status_code == 200, deleted.text
        assert not any(m["id"] == item["id"] for m in deleted.json()["menu"])

        # Slug conflict: try to rename this new restaurant to the seeded kaka slug.
        conflict = c.patch(f"/admin/restaurants/{rid}", json={"slug": "kaka-restaurant"})
        assert conflict.status_code == 409, conflict.text
    finally:
        c.close()
