"""Auth router — register/verify, login (+2FA), sessions, password reset, profile, API keys."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey
from app.schemas.auth import (
    RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, TokenResponse, UserResponse, UserUpdate,
    EmailRequest, VerifyEmailRequest, ResetPasswordRequest, RefreshRequest,
    MfaChallengeRequest, MfaCodeRequest, MfaSetupResponse, MfaStatusResponse,
)
from app.services import email_service
from app.services.auth_service import (
    REFRESH_TOKEN_DAYS, register_user, authenticate_user, create_access_token, create_refresh_token,
    create_mfa_token, decode_token, get_user_by_id, get_user_by_email, normalize_email, hash_password,
    password_fingerprint, issue_auth_code, consume_auth_code, new_totp_secret, totp_uri, verify_totp,
)
from app.services.crypto_service import encrypt_value, decrypt_value
from app.config import settings
from app.middleware.auth import get_current_user
from app.limiter import limiter

logger = logging.getLogger("nexus.auth")

router = APIRouter(prefix="/auth", tags=["Auth"])


# ─── Pydantic models for API keys ───

class ApiKeyCreateRequest(BaseModel):
    name: str = "CLI Key"

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    last_used_at: str | None
    created_at: str

class ApiKeyCreatedResponse(ApiKeyResponse):
    full_key: str  # Only returned on creation


# ─── Session helpers ───

REFRESH_COOKIE = "nexus_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _is_mobile(request: Request) -> bool:
    return request.headers.get("X-Client", "").lower() == "mobile"


def _start_session(request: Request, response: Response, user: User) -> TokenResponse:
    """Issue access + refresh tokens. Web gets the refresh token as an HttpOnly cookie, mobile in the body."""
    refresh = create_refresh_token(user)
    mobile = _is_mobile(request)
    if not mobile:
        response.set_cookie(
            key=REFRESH_COOKIE,
            value=refresh,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            path=REFRESH_COOKIE_PATH,
            max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        )
    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        refresh_token=refresh if mobile else None,
    )


async def _send_code(user: User, purpose: str) -> None:
    code = issue_auth_code(user, purpose)
    try:
        await email_service.send_code(user.email, code, purpose)
    except Exception:
        logger.exception("No se pudo enviar el correo (%s) a %s", purpose, user.email)
        raise HTTPException(status_code=503, detail="No pudimos enviar el correo. Intenta de nuevo en unos minutos.")


# ─── Auth endpoints ───

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Crear cuenta. Envía un código al correo; la sesión empieza al verificarlo."""
    email = normalize_email(body.email)
    user = await get_user_by_email(db, email)
    if user and user.email_verified:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if user:
        # Registro previo sin verificar: quien tenga acceso al correo puede reclamarlo
        user.hashed_password = hash_password(body.password)
        if body.display_name:
            user.display_name = body.display_name
    else:
        try:
            user = await register_user(db, email, body.password, body.display_name, email_verified=False)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    await _send_code(user, "verify")
    await db.commit()
    return RegisterResponse(email=user.email)


@router.post("/verify-email", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_email(request: Request, response: Response, body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Confirmar el correo con el código e iniciar sesión."""
    user = await get_user_by_email(db, body.email)
    if not user or user.email_verified:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    ok = consume_auth_code(user, "verify", body.code)
    if not ok:
        await db.commit()  # persist the failed attempt
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    user.email_verified = True
    await db.commit()
    return _start_session(request, response, user)


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, body: EmailRequest, db: AsyncSession = Depends(get_db)):
    """Reenviar el código de verificación (respuesta idéntica exista o no la cuenta)."""
    user = await get_user_by_email(db, body.email)
    if user and not user.email_verified:
        await _send_code(user, "verify")
        await db.commit()
    return {"status": "ok"}


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Iniciar sesión. Si el usuario tiene 2FA, devuelve un reto (mfa_token) en vez de la sesión."""
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    if not user.email_verified:
        await _send_code(user, "verify")
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifica tu correo: te enviamos un código nuevo",
            headers={"X-Auth-Error": "email_not_verified"},
        )
    if user.totp_enabled:
        return LoginResponse(mfa_required=True, mfa_token=create_mfa_token(user))
    return LoginResponse(**_start_session(request, response, user).model_dump())


@router.post("/mfa/challenge", response_model=TokenResponse)
@limiter.limit("5/minute")
async def mfa_challenge(request: Request, response: Response, body: MfaChallengeRequest, db: AsyncSession = Depends(get_db)):
    """Segundo paso del login con 2FA: canjear mfa_token + código TOTP por la sesión."""
    payload = decode_token(body.mfa_token)
    if not payload or payload.get("type") != "mfa":
        raise HTTPException(status_code=401, detail="La verificación expiró, inicia sesión de nuevo")
    user = await get_user_by_id(db, payload.get("sub") or "")
    if not user or not user.totp_enabled or payload.get("pwv") != password_fingerprint(user):
        raise HTTPException(status_code=401, detail="La verificación expiró, inicia sesión de nuevo")
    if not verify_totp(decrypt_value(user.totp_secret), body.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")
    return _start_session(request, response, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    db: AsyncSession = Depends(get_db),
    nexus_refresh_token: str | None = Cookie(default=None),
):
    """Renovar la sesión (cookie HttpOnly en web, body en móvil). Rota el refresh token."""
    token = nexus_refresh_token or (body.refresh_token if body else None)
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await get_user_by_id(db, payload.get("sub") or "")
    # pwv: un cambio de contraseña invalida todas las sesiones anteriores
    if not user or payload.get("pwv") != password_fingerprint(user):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return _start_session(request, response, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Cerrar sesión en web (borra la cookie de refresh)."""
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, secure=settings.is_production, httponly=True, samesite="lax")


@router.post("/password/forgot")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: EmailRequest, db: AsyncSession = Depends(get_db)):
    """Enviar código para restablecer la contraseña (respuesta idéntica exista o no la cuenta)."""
    user = await get_user_by_email(db, body.email)
    if user:
        await _send_code(user, "reset")
        await db.commit()
    return {"status": "ok"}


@router.post("/password/reset")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Crear una contraseña nueva con el código enviado por correo. Cierra las sesiones anteriores."""
    user = await get_user_by_email(db, body.email)
    if not user or not consume_auth_code(user, "reset", body.code):
        if user:
            await db.commit()  # persist the failed attempt
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    user.hashed_password = hash_password(body.new_password)
    user.email_verified = True  # recibió el código, así que controla el correo
    await db.commit()
    return {"status": "ok"}


# ─── 2FA (TOTP) ───

@router.get("/mfa", response_model=MfaStatusResponse)
async def mfa_status(user: User = Depends(get_current_user)):
    return MfaStatusResponse(enabled=user.totp_enabled)


@router.post("/mfa/setup", response_model=MfaSetupResponse)
async def mfa_setup(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generar un secreto TOTP nuevo (queda pendiente hasta confirmarlo con /mfa/enable)."""
    if user.totp_enabled:
        raise HTTPException(status_code=409, detail="El 2FA ya está activo")
    secret = new_totp_secret()
    user.totp_secret = encrypt_value(secret)
    await db.commit()
    return MfaSetupResponse(secret=secret, otpauth_uri=totp_uri(secret, user.email))


@router.post("/mfa/enable", response_model=MfaStatusResponse)
@limiter.limit("10/minute")
async def mfa_enable(request: Request, body: MfaCodeRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Primero genera el código QR")
    if not verify_totp(decrypt_value(user.totp_secret), body.code):
        raise HTTPException(status_code=400, detail="Código incorrecto")
    user.totp_enabled = True
    await db.commit()
    return MfaStatusResponse(enabled=True)


@router.post("/mfa/disable", response_model=MfaStatusResponse)
async def mfa_disable(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.totp_enabled = False
    user.totp_secret = None
    await db.commit()
    return MfaStatusResponse(enabled=False)


@router.get("/me", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Obtener perfil del usuario autenticado."""
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        plan=user.plan,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar perfil."""
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        plan=user.plan,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


# ─── API Key endpoints ───

@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def generate_api_key(
    body: ApiKeyCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generar nueva API key para el CLI. La key completa solo se muestra UNA vez."""
    try:
        full_key, prefix, key_hash = ApiKey.generate_key()

        api_key = ApiKey(
            name=body.name,
            key_prefix=prefix,
            key_hash=key_hash,
            user_id=user.id,
        )
        db.add(api_key)
        await db.commit()
        await db.refresh(api_key)

        return ApiKeyCreatedResponse(
            id=api_key.id,
            name=api_key.name,
            key_prefix=api_key.key_prefix,
            full_key=full_key,
            is_active=api_key.is_active,
            last_used_at=None,
            created_at=api_key.created_at.isoformat() if api_key.created_at else "",
        )
    except Exception as e:
        import logging
        logger = logging.getLogger("nexus")
        logger.error(f"Error generating API key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating API key")


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar API keys (sin mostrar la key completa, solo el prefijo)."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.is_active == True)
    )
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            is_active=k.is_active,
            last_used_at=k.last_used_at.isoformat() if k.last_used_at else None,
            created_at=k.created_at.isoformat() if k.created_at else "",
        )
        for k in keys
    ]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revocar una API key (soft delete)."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key no encontrada")

    api_key.is_active = False
    await db.commit()

