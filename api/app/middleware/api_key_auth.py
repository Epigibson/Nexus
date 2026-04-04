"""API Key authentication middleware for CLI clients."""

import hashlib
from datetime import datetime, timezone

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.api_key import ApiKey
from app.models.user import User

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_user_from_api_key(
    api_key: str | None = Security(api_key_header),
) -> User | None:
    """Validate API key and return the associated user. Returns None if no key provided."""
    if not api_key:
        return None

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
        )
        api_key_obj = result.scalar_one_or_none()

        if not api_key_obj:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Update last_used_at
        await db.execute(
            update(ApiKey)
            .where(ApiKey.id == api_key_obj.id)
            .values(last_used_at=datetime.now(timezone.utc))
        )
        await db.commit()

        # Fetch the user
        user_result = await db.execute(
            select(User).where(User.id == api_key_obj.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found for API key")

        return user
