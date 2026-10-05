import os

os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['ENCRYPTION_KEY'] = 'gZz3p44P624ZzYGBa8qL4Vqof9w4d7S0AILv6Ew8zZ0='

"""Shared test fixtures — in-memory SQLite DB, test client, auth helpers."""

import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.services.auth_service import register_user, create_access_token
from app.limiter import limiter

# Los tests hacen muchos logins seguidos desde la misma "IP"
limiter.enabled = False


# ── Engine & Session ──

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ── Fixtures ──

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    """Provide a fresh DB session for service-level tests."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db):
    """Provide an async HTTP client wired to the test DB."""
    async def override_get_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_user(db):
    """Register a test user, return (user, token)."""
    user = await register_user(db, "test@test.com", "Password123", "Test User")
    await db.commit()
    token = create_access_token(user.id, user.email)
    return user, token


@pytest_asyncio.fixture
async def auth_headers(auth_user):
    """Return headers with Bearer token."""
    _, token = auth_user
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
def sent_codes(monkeypatch):
    """Capture emailed one-time codes instead of sending them: {email: [code, ...]}."""
    from app.services import email_service
    codes: dict[str, list[str]] = {}

    async def fake_send_code(to, code, purpose):
        codes.setdefault(to, []).append(code)

    monkeypatch.setattr(email_service, "send_code", fake_send_code)
    return codes
