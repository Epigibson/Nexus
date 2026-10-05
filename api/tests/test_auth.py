"""Auth endpoint tests — registration + email verification, login, 2FA, sessions, password reset."""

import pyotp
import pytest

from app.services.auth_service import create_refresh_token, get_user_by_email

PW = "Secure123"


async def register_and_verify(client, sent_codes, email="new@test.com", password=PW, headers=None):
    r = await client.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": "New User"})
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/auth/verify-email", json={"email": email, "code": sent_codes[email][-1]}, headers=headers or {})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_register_requires_verification(client, sent_codes):
    """POST /auth/register creates an unverified user and emails a code; no session yet."""
    r = await client.post("/api/v1/auth/register", json={"email": "New@Test.com", "password": PW})
    assert r.status_code == 201
    assert r.json() == {"status": "verification_required", "email": "new@test.com"}
    assert "access_token" not in r.json()
    assert len(sent_codes["new@test.com"]) == 1

    # Can't log in before verifying — and a fresh code is sent
    r = await client.post("/api/v1/auth/login", json={"email": "new@test.com", "password": PW})
    assert r.status_code == 403
    assert r.headers["X-Auth-Error"] == "email_not_verified"
    assert len(sent_codes["new@test.com"]) == 2


@pytest.mark.asyncio
async def test_verify_email_starts_session(client, sent_codes):
    data = await register_and_verify(client, sent_codes)
    assert data["access_token"]
    assert data["refresh_token"] is None  # web: refresh token only in the HttpOnly cookie
    assert "nexus_refresh_token" in client.cookies

    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == "new@test.com"


@pytest.mark.asyncio
async def test_verify_email_wrong_code_and_lockout(client, sent_codes):
    await client.post("/api/v1/auth/register", json={"email": "lock@test.com", "password": PW})
    good = sent_codes["lock@test.com"][-1]
    bad = "000000" if good != "000000" else "111111"
    for _ in range(5):
        r = await client.post("/api/v1/auth/verify-email", json={"email": "lock@test.com", "code": bad})
        assert r.status_code == 400
    # After 5 failures the code is burned, even the right one
    r = await client.post("/api/v1/auth/verify-email", json={"email": "lock@test.com", "code": good})
    assert r.status_code == 400
    # Resend issues a working one
    await client.post("/api/v1/auth/resend-verification", json={"email": "lock@test.com"})
    r = await client.post("/api/v1/auth/verify-email", json={"email": "lock@test.com", "code": sent_codes["lock@test.com"][-1]})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_register_duplicate_email(client, sent_codes):
    """Registering a verified email again fails; an unverified one can be re-claimed."""
    payload = {"email": "dup@test.com", "password": PW}
    assert (await client.post("/api/v1/auth/register", json=payload)).status_code == 201
    assert (await client.post("/api/v1/auth/register", json=payload)).status_code == 201  # still unverified
    await client.post("/api/v1/auth/verify-email", json={"email": "dup@test.com", "code": sent_codes["dup@test.com"][-1]})
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409
    assert "already" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success_and_wrong_password(client, sent_codes):
    await register_and_verify(client, sent_codes, "login@test.com")
    r = await client.post("/api/v1/auth/login", json={"email": "LOGIN@test.com", "password": PW})
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert r.json()["mfa_required"] is False

    r = await client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "Incorrect1"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_cookie_and_logout(client, sent_codes):
    await register_and_verify(client, sent_codes, "ref@test.com")
    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 200
    assert r.json()["access_token"]

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    client.cookies.clear()
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


@pytest.mark.asyncio
async def test_mobile_gets_refresh_token_in_body(client, sent_codes):
    mobile = {"X-Client": "mobile"}
    data = await register_and_verify(client, sent_codes, "mob@test.com", headers=mobile)
    assert data["refresh_token"]
    client.cookies.clear()
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": data["refresh_token"]}, headers=mobile)
    assert r.status_code == 200
    assert r.json()["refresh_token"]


@pytest.mark.asyncio
async def test_refresh_and_mfa_tokens_are_not_access_tokens(client, db, sent_codes):
    await register_and_verify(client, sent_codes, "types@test.com")
    user = await get_user_by_email(db, "types@test.com")
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {create_refresh_token(user)}"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_invalidates_sessions(client, sent_codes):
    await register_and_verify(client, sent_codes, "reset@test.com")
    old_refresh = client.cookies.get("nexus_refresh_token")

    # Unknown emails get the same answer and no email
    r = await client.post("/api/v1/auth/password/forgot", json={"email": "nobody@test.com"})
    assert r.status_code == 200 and "nobody@test.com" not in sent_codes

    await client.post("/api/v1/auth/password/forgot", json={"email": "reset@test.com"})
    r = await client.post("/api/v1/auth/password/reset", json={
        "email": "reset@test.com", "code": sent_codes["reset@test.com"][-1], "new_password": "Brandnew1",
    })
    assert r.status_code == 200

    assert (await client.post("/api/v1/auth/login", json={"email": "reset@test.com", "password": PW})).status_code == 401
    assert (await client.post("/api/v1/auth/login", json={"email": "reset@test.com", "password": "Brandnew1"})).status_code == 200

    client.cookies.clear()
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_verifies_legacy_unverified_user(client, sent_codes):
    await client.post("/api/v1/auth/register", json={"email": "legacy@test.com", "password": PW})
    await client.post("/api/v1/auth/password/forgot", json={"email": "legacy@test.com"})
    await client.post("/api/v1/auth/password/reset", json={
        "email": "legacy@test.com", "code": sent_codes["legacy@test.com"][-1], "new_password": "Brandnew1",
    })
    r = await client.post("/api/v1/auth/login", json={"email": "legacy@test.com", "password": "Brandnew1"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_totp_setup_login_and_disable(client, sent_codes):
    data = await register_and_verify(client, sent_codes, "mfa@test.com")
    auth = {"Authorization": f"Bearer {data['access_token']}"}

    assert (await client.get("/api/v1/auth/mfa", headers=auth)).json() == {"enabled": False}
    setup = (await client.post("/api/v1/auth/mfa/setup", headers=auth)).json()
    assert setup["otpauth_uri"].startswith("otpauth://totp/Nexus:mfa%40test.com")
    totp = pyotp.TOTP(setup["secret"])

    bad = "000000" if totp.now() != "000000" else "111111"
    assert (await client.post("/api/v1/auth/mfa/enable", json={"code": bad}, headers=auth)).status_code == 400
    r = await client.post("/api/v1/auth/mfa/enable", json={"code": totp.now()}, headers=auth)
    assert r.json() == {"enabled": True}

    # Login now returns a challenge, and the MFA token is not an access token
    r = await client.post("/api/v1/auth/login", json={"email": "mfa@test.com", "password": PW})
    body = r.json()
    assert body["mfa_required"] is True and body["access_token"] is None
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['mfa_token']}"})).status_code == 401

    assert (await client.post("/api/v1/auth/mfa/challenge", json={"mfa_token": body["mfa_token"], "code": bad})).status_code == 400
    r = await client.post("/api/v1/auth/mfa/challenge", json={"mfa_token": body["mfa_token"], "code": totp.now()})
    assert r.status_code == 200 and r.json()["access_token"]

    assert (await client.post("/api/v1/auth/mfa/disable", headers=auth)).json() == {"enabled": False}
    r = await client.post("/api/v1/auth/login", json={"email": "mfa@test.com", "password": PW})
    assert r.json()["mfa_required"] is False


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    """GET /auth/me without token returns 401."""
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_with_token(client, auth_headers):
    """GET /auth/me with valid token returns profile."""
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "test@test.com"
    assert data["plan"] == "free"
