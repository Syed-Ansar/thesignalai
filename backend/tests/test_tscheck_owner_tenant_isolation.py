"""Criterion: Owner login is tenant-scoped. An owner can only see their own restaurant and
cannot reach platform-scope actions; anonymous callers are rejected."""

import httpx

from tests.conftest import api_url, authed_client

OWNER_EMAIL = "owner@kaka.restaurant"
OWNER_PASSWORD = "KakaOwner@2026"


def _owner_client() -> httpx.Client:
    return authed_client(OWNER_EMAIL, OWNER_PASSWORD)


def test_owner_sees_only_own_restaurant_and_cannot_list_platform_wide():
    c = _owner_client()
    try:
        r = c.get("/admin/restaurants")
        assert r.status_code == 200, r.text
        slugs = {x["slug"] for x in r.json()}
        assert slugs == {"kaka-restaurant"}, f"owner should only see kaka, saw {slugs}"
    finally:
        c.close()


def test_owner_cannot_access_other_tenant_or_create_restaurant():
    c = _owner_client()
    try:
        # rest-mana belongs to a different tenant -> 404 (not visible), not 403
        r = c.get("/admin/restaurants/rest-mana/analytics")
        assert r.status_code == 404, r.text

        r2 = c.post("/admin/restaurants", json={"name": "tscheck-owner-should-fail", "location": "X"})
        assert r2.status_code == 403, r2.text
    finally:
        c.close()


def test_anonymous_cannot_list_restaurants():
    with httpx.Client(base_url=api_url(), timeout=30.0) as c:
        r = c.get("/admin/restaurants")
        assert r.status_code == 401, r.text


def test_owner_wrong_password_rejected():
    with httpx.Client(base_url=api_url(), timeout=30.0) as c:
        r = c.post("/auth/login", json={"email": OWNER_EMAIL, "password": "wrong-password-xyz"})
        assert r.status_code == 401, r.text
