"""Criterion: Super-admin can create workspaces and manage owner logins, scoped per-restaurant."""

import uuid

import httpx

from tests.conftest import api_url, authed_client

SUPER_EMAIL = "admin@reviewstudio.app"
SUPER_PASSWORD = "Studio@2026"


def _super_client() -> httpx.Client:
    return authed_client(SUPER_EMAIL, SUPER_PASSWORD)


def test_superadmin_sees_both_seeded_restaurants():
    c = _super_client()
    try:
        r = c.get("/admin/restaurants")
        assert r.status_code == 200, r.text
        slugs = {x["slug"] for x in r.json()}
        assert {"kaka-restaurant", "mana-restaurant"} <= slugs
    finally:
        c.close()


def test_superadmin_creates_workspace_and_manages_owner_lifecycle():
    c = _super_client()
    owner_email = f"tscheck-owner-{uuid.uuid4().hex[:8]}@example.com"
    owner_password = "Tscheck@2026"
    try:
        created = c.post(
            "/admin/restaurants",
            json={"name": f"tscheck-workspace-{uuid.uuid4().hex[:6]}", "location": "Testville"},
        )
        assert created.status_code == 200, created.text
        rid = created.json()["id"]
        slug = created.json()["slug"]

        # New workspace's guest endpoint should be reachable with default empty menu.
        pub = c.get(f"/public/restaurants/{slug}")
        assert pub.status_code == 200, pub.text
        assert pub.json()["menu"] == []

        # Add an owner login scoped to this restaurant.
        add = c.post(f"/admin/restaurants/{rid}/owners", json={"email": owner_email, "password": owner_password})
        assert add.status_code == 200, add.text

        # That owner can log in and sees only this restaurant.
        owner_c = authed_client(owner_email, owner_password)
        try:
            listing = owner_c.get("/admin/restaurants")
            assert listing.status_code == 200
            assert {x["slug"] for x in listing.json()} == {slug}
        finally:
            owner_c.close()

        # Remove the owner -> login must fail afterwards.
        owners = c.get(f"/admin/restaurants/{rid}/owners")
        assert owners.status_code == 200, owners.text
        owner_id = next(o["id"] for o in owners.json() if o["email"] == owner_email)
        removed = c.delete(f"/admin/restaurants/{rid}/owners/{owner_id}")
        assert removed.status_code == 200, removed.text

        relogin = httpx.Client(base_url=api_url(), timeout=30.0)
        try:
            r2 = relogin.post("/auth/login", json={"email": owner_email, "password": owner_password})
            assert r2.status_code == 401, r2.text
        finally:
            relogin.close()
    finally:
        c.close()
