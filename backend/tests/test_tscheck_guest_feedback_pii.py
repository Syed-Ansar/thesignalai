"""Criterion: Guest 1-3-star private feedback is stored and PII (phone/email/bill numbers) is
stripped server-side from the message."""

KAKA_SLUG = "kaka-restaurant"


def test_guest_feedback_strips_pii_from_message(client):
    message = (
        "tscheck-feedback: the food was cold. Call me at 9876543210 or "
        "email me at guest@example.com, bill number INV-20394."
    )
    resp = client.post(
        f"/public/restaurants/{KAKA_SLUG}/feedback",
        json={"rating": 2, "message": message, "issues": ["Food Quality"]},
    )
    assert resp.status_code == 200, resp.text
    fb = resp.json()
    assert fb["status"] == "new"
    assert fb["rating"] == 2
    assert "9876543210" not in fb["message"]
    assert "guest@example.com" not in fb["message"]
    assert "20394" not in fb["message"]
    assert "tscheck-feedback" in fb["message"]


def test_guest_feedback_rejects_rating_outside_1_to_3(client):
    resp = client.post(
        f"/public/restaurants/{KAKA_SLUG}/feedback",
        json={"rating": 5, "message": "tscheck should fail", "issues": []},
    )
    assert resp.status_code == 422, resp.text
