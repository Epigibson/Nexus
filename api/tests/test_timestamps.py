"""Las fechas que salen de la API llevan zona UTC explícita ("...Z").

Sin zona, los navegadores y la app las interpretaban como hora local (6 h corridas en México).
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.services.time_utils import utc_iso


def test_utc_iso_naive_is_treated_as_utc():
    assert utc_iso(datetime(2026, 10, 5, 6, 10, 35, 575528)) == "2026-10-05T06:10:35.575Z"


def test_utc_iso_converts_other_timezones():
    cdmx = timezone(timedelta(hours=-6))
    assert utc_iso(datetime(2026, 10, 5, 0, 10, 35, tzinfo=cdmx)) == "2026-10-05T06:10:35.000Z"


def test_utc_iso_none():
    assert utc_iso(None) is None


def _is_utc(value: str) -> bool:
    return value.endswith("Z") and datetime.fromisoformat(value.replace("Z", "+00:00")).tzinfo is not None


@pytest.mark.asyncio
async def test_endpoints_return_utc_timestamps(client, auth_headers):
    me = (await client.get("/api/v1/auth/me", headers=auth_headers)).json()
    assert _is_utc(me["created_at"]), me["created_at"]

    r = await client.post("/api/v1/projects/", headers=auth_headers, json={"name": "Zona", "slug": "zona"})
    assert r.status_code == 201, r.text
    assert _is_utc(r.json()["created_at"])

    projects = (await client.get("/api/v1/projects/", headers=auth_headers)).json()
    assert all(_is_utc(p["created_at"]) for p in projects)

    key = (await client.post("/api/v1/auth/api-keys", headers=auth_headers, json={"name": "tz"})).json()
    assert _is_utc(key["created_at"])

    members = (await client.get("/api/v1/teams/members", headers=auth_headers)).json()
    assert members and all(_is_utc(m["joined_at"]) for m in members)
