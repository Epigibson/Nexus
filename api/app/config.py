"""Nexus API — Configuration via Pydantic BaseSettings."""

import json
import logging
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
from typing import List, Optional
import os

logger = logging.getLogger("nexus.config")

# Placeholder patterns that should NEVER be used in production
INSECURE_PATTERNS = [
    "CHANGE_ME", "YOUR_", "placeholder", "example", "test-",
    "dev-secret-key", "sk_test_YOUR", "pk_test_YOUR", "whsec_YOUR"
]


def _is_placeholder(value: str) -> bool:
    """Check if a value looks like an insecure placeholder."""
    if not value:
        return True
    value_lower = value.lower()
    return any(pattern.lower() in value_lower for pattern in INSECURE_PATTERNS)


class Settings(BaseSettings):
    # App
    app_name: str = "Nexus API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Database — supports both SQLite (local) and PostgreSQL (Supabase)
    database_url: str = "sqlite+aiosqlite:///./nexus.db"

    @field_validator("database_url", mode="before")
    @classmethod
    def format_database_url(cls, v):
        if v and (v.startswith("postgres://") or v.startswith("postgresql://")):
            # SQLAlchemy async requires postgresql+asyncpg://
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Supabase (optional — for production)
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    # JWT & Crypto
    secret_key: str
    encryption_key: str
    access_token_expire_minutes: int = 15  # 15 minutes (was 24 hours)
    algorithm: str = "HS256"

    # AWS Cognito
    cognito_region: str = "us-east-1"
    cognito_user_pool_id: Optional[str] = None
    cognito_client_id: Optional[str] = None

    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]

    # Freemium limits
    free_max_projects: int = 3
    free_max_cli_tools: int = 5
    free_max_members: int = 1
    premium_max_projects: int = 100
    premium_max_cli_tools: int = 999  # virtually unlimited
    premium_max_members: int = 50

    # Stripe
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_premium_price_id: Optional[str] = None  # "auto" = create on boot

    # Environment
    environment: str = "development"

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # Admin
    admin_email: str = "admin@nexus.dev"

    @model_validator(mode="after")
    def validate_production_security(self):
        """Validate that critical credentials are not placeholders in production."""
        is_prod = self.environment.lower() == "production" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ

        if is_prod:
            errors = []

            # SECRET_KEY must not be placeholder
            if _is_placeholder(self.secret_key):
                errors.append("SECRET_KEY is a placeholder — generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")

            # ENCRYPTION_KEY must not be placeholder
            if _is_placeholder(self.encryption_key):
                errors.append("ENCRYPTION_KEY is a placeholder — generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")

            # DATABASE_URL must not be placeholder
            if _is_placeholder(self.database_url):
                errors.append("DATABASE_URL is a placeholder — set your Supabase connection string")

            # Stripe webhook secret must be real if Stripe is configured
            if self.stripe_secret_key and not self.stripe_secret_key.startswith("sk_test_YOUR") and not self.stripe_secret_key.startswith("sk_live_YOUR"):
                # Stripe is configured with a real key, require webhook secret
                if not self.stripe_webhook_secret or _is_placeholder(self.stripe_webhook_secret):
                    errors.append("STRIPE_WEBHOOK_SECRET is required when Stripe is configured — get from Stripe Dashboard → Webhooks")

            if errors:
                error_msg = "Production security validation FAILED:\n" + "\n".join(f"  - {e}" for e in errors)
                logger.error(error_msg)
                raise ValueError(error_msg)

        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, list):
            origins = v
        elif isinstance(v, str):
            v = v.strip()
            # Try JSON first: ["url1","url2"]
            if v.startswith("["):
                try:
                    origins = json.loads(v)
                except json.JSONDecodeError:
                    origins = [u.strip().strip('"').strip("'") for u in v.split(",") if u.strip()]
            else:
                # Comma-separated: url1,url2
                origins = [u.strip().strip('"').strip("'") for u in v.split(",") if u.strip()]
        else:
            origins = v if isinstance(v, list) else []

        # Only add localhost in development mode
        environment = os.environ.get("ENVIRONMENT", "development").lower()
        if environment != "production" and "AWS_LAMBDA_FUNCTION_NAME" not in os.environ:
            for local in ["http://localhost:3000", "http://127.0.0.1:3000"]:
                if local not in origins:
                    origins.append(local)
        return origins

    @property
    def is_postgres(self) -> bool:
        """Check if we're using PostgreSQL (Supabase) vs SQLite."""
        return "postgres" in self.database_url

    @property
    def is_production(self) -> bool:
        """Check if running in production (AWS Lambda)."""
        return self.environment.lower() == "production" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
