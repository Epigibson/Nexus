"""Auth service — JWT tokens, password hashing, email codes and TOTP."""

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import pyotp
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, OrgRole


REFRESH_TOKEN_DAYS = 30
AUTH_CODE_TTL = timedelta(minutes=15)
AUTH_CODE_MAX_ATTEMPTS = 5

# Password validation regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number
PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


def validate_password_strength(password: str) -> bool:
    """Validate password meets minimum complexity requirements."""
    return bool(PASSWORD_PATTERN.match(password))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "type": "access",
        "jti": secrets.token_hex(16),  # Unique token ID for revocation
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def password_fingerprint(user: User) -> str:
    """Short fingerprint of the password hash: changing the password invalidates refresh/MFA tokens."""
    return hashlib.sha256(user.hashed_password.encode("utf-8")).hexdigest()[:16]


def create_refresh_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": expire,
        "type": "refresh",
        "pwv": password_fingerprint(user),
        "jti": secrets.token_hex(16),  # Unique token ID for rotation tracking
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_mfa_token(user: User) -> str:
    """Short-lived token proving the password step passed; exchanged for a session with a TOTP code."""
    payload = {
        "sub": user.id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "type": "mfa",
        "pwv": password_fingerprint(user),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str | None = None,
    user_id: str | None = None,
    email_verified: bool = True,
) -> User:
    """Register a new user and create their personal org."""
    # Validate password strength
    if not validate_password_strength(password):
        raise ValueError("Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number")

    email = normalize_email(email)
    if await get_user_by_email(db, email):
        raise ValueError("Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        display_name=display_name or email.split("@")[0],
        email_verified=email_verified,
    )
    if user_id:
        user.id = user_id
    db.add(user)
    await db.flush()

    # Create personal organization
    org = Organization(
        name=f"{user.display_name}'s Workspace",
        slug=email.split("@")[0].lower().replace(".", "-"),
        owner_id=user.id,
    )
    db.add(org)
    await db.flush()

    # Add as owner member
    member = OrganizationMember(org_id=org.id, user_id=user.id, role=OrgRole.owner)
    db.add(member)

    return user


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    # Case-insensitive: users migrated from Cognito may have been stored with mixed case
    result = await db.execute(select(User).where(func.lower(User.email) == normalize_email(email)))
    return result.scalars().first()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ─── One-time email codes ───

def _code_hmac(user: User, purpose: str, code: str) -> str:
    msg = f"{user.id}:{purpose}:{code}".encode("utf-8")
    return hmac.new(settings.secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def issue_auth_code(user: User, purpose: str) -> str:
    """Generate a 6-digit code for `purpose` ('verify' | 'reset'), store only its HMAC, return the code."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    user.auth_code_hash = _code_hmac(user, purpose, code)
    user.auth_code_purpose = purpose
    user.auth_code_expires_at = datetime.utcnow() + AUTH_CODE_TTL
    user.auth_code_attempts = 0
    return code


def consume_auth_code(user: User, purpose: str, code: str) -> bool:
    """Check a code; on success it is cleared. Too many wrong attempts burn the code."""
    if (
        not user.auth_code_hash
        or user.auth_code_purpose != purpose
        or not user.auth_code_expires_at
        or user.auth_code_expires_at < datetime.utcnow()
        or user.auth_code_attempts >= AUTH_CODE_MAX_ATTEMPTS
    ):
        return False
    if not hmac.compare_digest(user.auth_code_hash, _code_hmac(user, purpose, code.strip())):
        user.auth_code_attempts += 1
        return False
    user.auth_code_hash = None
    user.auth_code_purpose = None
    user.auth_code_expires_at = None
    user.auth_code_attempts = 0
    return True


# ─── TOTP (2FA) ───

def new_totp_secret() -> str:
    return pyotp.random_base32()


def totp_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Nexus")


def verify_totp(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)
