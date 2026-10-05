"""Auth middleware — JWT + API Key dependency for FastAPI."""

import hashlib

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey
from app.services.auth_service import get_user_by_id, decode_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency — supports JWT Bearer token, X-API-Key header, and local JWT tokens."""

    # ── Try X-API-Key header first (CLI auth) ──
    api_key = request.headers.get("X-API-Key")
    if api_key:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        try:
            result = await db.execute(
                select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
            )
            api_key_record = result.scalar_one_or_none()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error validating API key",
            )

        if not api_key_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key inválida o desactivada",
            )

        user = await get_user_by_id(db, api_key_record.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return user

    # ── Try JWT Bearer token (Dashboard / mobile auth) ──
    if credentials:
        payload = decode_token(credentials.credentials)
        # Only access tokens grant API access (refresh and MFA tokens have their own endpoints)
        if payload is None or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await get_user_by_id(db, payload.get("sub") or "")
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    # ── No auth provided ──
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticación requerida — usa Bearer token o X-API-Key",
        headers={"WWW-Authenticate": "Bearer"},
    )
