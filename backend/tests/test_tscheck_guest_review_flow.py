"""Criterion: Guest 4-5-star flow posts a review log for kaka-restaurant (public, no auth)."""

KAKA_SLUG = "kaka-restaurant"


def test_guest_5star_review_posts_successfully(client):
    r = client.get(f"/public/restaurants/{KAKA_SLUG}")
    assert r.status_code == 200, r.text
    restaurant = r.json()
    assert "Kaka Special Biryani" in restaurant["menu"]

    draft_body = {
        "rating": 5,
        "dishes": ["Kaka Special Biryani"],
        "vibes": ["Quick Service"],
        "note": "",
    }
    d = client.post(f"/public/restaurants/{KAKA_SLUG}/drafts", json=draft_body)
    assert d.status_code == 200, d.text
    draft = d.json()
    assert draft["text"] and draft["tone"] == "foodie"

    review_body = {
        "rating": 5,
        "dishes": ["Kaka Special Biryani"],
        "vibes": ["Quick Service"],
        "ai_draft": draft["text"],
        "final_text": draft["text"],
        "draft_style": "short",
        "contact_name": "tscheck-guest-review",
    }
    resp = client.post(f"/public/restaurants/{KAKA_SLUG}/reviews", json=review_body)
    assert resp.status_code == 200, resp.text
    log = resp.json()
    assert log["final_text"] == draft["text"]
    assert log["rating"] == 5
    assert log["contact_name"] == "tscheck-guest-review"


def test_guest_review_rejects_rating_below_4(client):
    # Draft endpoint requires rating 4-5; a 2-star draft request must be rejected.
    resp = client.post(
        f"/public/restaurants/{KAKA_SLUG}/drafts",
        json={"rating": 2, "dishes": ["Chicken 65"], "vibes": [], "note": ""},
    )
    assert resp.status_code == 422, resp.text
