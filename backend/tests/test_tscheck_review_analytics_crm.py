"""Criterion: Review logs, analytics (total reviews, conversion rate, top dishes) and CRM
feedback status (New<->Resolved, filterable) reflect logged guest activity."""

import uuid

import httpx

from tests.conftest import authed_client

SUPER_EMAIL = "admin@reviewstudio.app"
SUPER_PASSWORD = "Studio@2026"


def _super_client() -> httpx.Client:
    return authed_client(SUPER_EMAIL, SUPER_PASSWORD)


def _new_restaurant(c: httpx.Client) -> tuple[str, str]:
    created = c.post(
        "/admin/restaurants",
        json={"name": f"tscheck-analytics-{uuid.uuid4().hex[:6]}", "location": "Testville"},
    )
    assert created.status_code == 200, created.text
    return created.json()["id"], created.json()["slug"]


def test_review_log_and_analytics_reflect_guest_review(client):
    c = _super_client()
    try:
        rid, slug = _new_restaurant(c)

        visit = client.post(f"/public/restaurants/{slug}/visits", json={"rating": 5})
        assert visit.status_code == 200, visit.text

        review = client.post(
            f"/public/restaurants/{slug}/reviews",
            json={
                "rating": 5,
                "dishes": ["tscheck-dish-a"],
                "vibes": ["Quick Service"],
                "ai_draft": "draft",
                "final_text": "tscheck final review text",
                "draft_style": "short",
            },
        )
        assert review.status_code == 200, review.text
        review_id = review.json()["id"]

        logs = c.get(f"/admin/restaurants/{rid}/reviews")
        assert logs.status_code == 200, logs.text
        assert any(l["id"] == review_id and l["final_text"] == "tscheck final review text" for l in logs.json())

        analytics = c.get(f"/admin/restaurants/{rid}/analytics")
        assert analytics.status_code == 200, analytics.text
        data = analytics.json()
        assert data["total_reviews"] == 1
        assert data["total_visits"] == 1
        assert data["conversion_rate"] == 1.0
        assert any(d["name"] == "tscheck-dish-a" and d["count"] == 1 for d in data["top_dishes"])
    finally:
        c.close()


def test_crm_feedback_status_toggle_and_filter(client):
    c = _super_client()
    try:
        rid, slug = _new_restaurant(c)

        fb = client.post(
            f"/public/restaurants/{slug}/feedback",
            json={"rating": 2, "message": "tscheck crm feedback row", "issues": ["Service"]},
        )
        assert fb.status_code == 200, fb.text
        fid = fb.json()["id"]
        assert fb.json()["status"] == "new"

        listed_new = c.get(f"/admin/restaurants/{rid}/feedback", params={"status": "new"})
        assert listed_new.status_code == 200
        assert any(f["id"] == fid for f in listed_new.json())

        toggled = c.patch(f"/admin/restaurants/{rid}/feedback/{fid}", json={"status": "resolved"})
        assert toggled.status_code == 200, toggled.text
        assert toggled.json()["status"] == "resolved"

        listed_resolved = c.get(f"/admin/restaurants/{rid}/feedback", params={"status": "resolved"})
        assert any(f["id"] == fid for f in listed_resolved.json())
        listed_new_after = c.get(f"/admin/restaurants/{rid}/feedback", params={"status": "new"})
        assert not any(f["id"] == fid for f in listed_new_after.json())
    finally:
        c.close()
