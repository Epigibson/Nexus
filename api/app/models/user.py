"""User/Profile model — mirrors profiles table."""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Enum as SAEnum, JSON, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


class PlanTier(str, enum.Enum):
    free = "free"
    premium = "premium"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    plan: Mapped[str] = mapped_column(
        SAEnum(PlanTier, native_enum=False, length=20),
        default=PlanTier.free,
        nullable=False,
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    # Autenticación propia (antes Cognito)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    totp_secret: Mapped[str | None] = mapped_column(String(255))  # cifrado con ENCRYPTION_KEY
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    # Código de un solo uso enviado por correo (verificación o recuperación); solo se guarda su HMAC
    auth_code_hash: Mapped[str | None] = mapped_column(String(128))
    auth_code_purpose: Mapped[str | None] = mapped_column(String(20))
    auth_code_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    auth_code_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    organizations = relationship("Organization", back_populates="owner", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
