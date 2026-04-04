"""Antigravity API — Database engine and session factory (SQLAlchemy 2.0 async)."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    # SQLite needs this for async; PostgreSQL ignores it
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Alias for middleware that needs its own session (not from FastAPI dependency)
AsyncSessionLocal = async_session


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db():
    """FastAPI dependency — yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables (dev only — use Alembic in production)."""
    # Import all models so they register with Base.metadata
    import app.models.user  # noqa: F401
    import app.models.organization  # noqa: F401
    import app.models.project  # noqa: F401
    import app.models.skill  # noqa: F401
    import app.models.environment  # noqa: F401
    import app.models.audit  # noqa: F401
    import app.models.subscription  # noqa: F401
    import app.models.api_key  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

