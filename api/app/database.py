"""Nexus API — Database engine and session factory (SQLAlchemy 2.0 async).

Supports both SQLite (local development) and PostgreSQL (Supabase production).
Switch by changing DATABASE_URL in .env.
"""

import uuid
import ssl
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


# ─── Engine configuration ───
# Only echo SQL in development, never in production
engine_kwargs = {
    "echo": settings.debug and not settings.is_production,
}

if settings.is_postgres:
    # PostgreSQL (Supabase) — use NullPool for serverless-friendly connections
    engine_kwargs["poolclass"] = NullPool
    # Verify connections before use — prevents stale connection errors on Lambda resume
    engine_kwargs["pool_pre_ping"] = True
    
    # Create SSL context for Supabase
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Connection args for asyncpg
    engine_kwargs["connect_args"] = {
        "ssl": ssl_context,
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
        "timeout": 15,
        "command_timeout": 15,
    }
else:
    # SQLite — needs check_same_thread=False for async
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.database_url, **engine_kwargs)

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
    """Create all tables (dev only — use migrations in production)."""
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

    # Auto-migrate: add missing columns to existing tables
    await _auto_migrate()


async def _auto_migrate():
    """Safely add missing columns to existing tables (idempotent)."""
    migrations = [
        # (table, column, sql_type, default)
        ("environment_profiles", "hooks", "JSON", "'[]'"),
    ]

    async with engine.begin() as conn:
        for table, column, sql_type, default in migrations:
            try:
                if settings.is_postgres:
                    # PostgreSQL supports IF NOT EXISTS
                    await conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {sql_type} DEFAULT {default}")
                    )
                else:
                    # SQLite: check if column exists first, then add
                    result = await conn.execute(
                        text(f"PRAGMA table_info({table})")
                    )
                    columns = [row[1] for row in result.fetchall()]
                    if column not in columns:
                        await conn.execute(
                            text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type} DEFAULT {default}")
                        )
                print(f"  Migration: {table}.{column} ensured")
            except Exception as e:
                # Column might already exist or DB doesn't support IF NOT EXISTS
                print(f"  Migration {table}.{column}: {e}")
