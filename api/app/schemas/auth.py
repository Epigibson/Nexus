"""Auth schemas — register, login, token."""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


PASSWORD_RULE = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
PASSWORD_RULE_MSG = "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, examples=["dev@acme.com"])
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=100, examples=["Carlos Dev"])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not re.match(PASSWORD_RULE, v):
            raise ValueError(PASSWORD_RULE_MSG)
        return v


class LoginRequest(BaseModel):
    email: str = Field(..., examples=["dev@acme.com"])
    password: str = Field(...)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    display_name: str | None
    # Solo para clientes sin cookies (app móvil, header X-Client: mobile); el web usa la cookie HttpOnly
    refresh_token: str | None = None


class LoginResponse(BaseModel):
    """Either a session (same fields as TokenResponse) or an MFA challenge."""
    mfa_required: bool = False
    mfa_token: str | None = None
    access_token: str | None = None
    token_type: str = "bearer"
    user_id: str | None = None
    email: str | None = None
    display_name: str | None = None
    refresh_token: str | None = None


class RegisterResponse(BaseModel):
    status: str = "verification_required"
    email: str


class EmailRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if not re.match(PASSWORD_RULE, v):
            raise ValueError(PASSWORD_RULE_MSG)
        return v


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class MfaChallengeRequest(BaseModel):
    mfa_token: str
    code: str = Field(..., min_length=6, max_length=6)


class MfaCodeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class MfaStatusResponse(BaseModel):
    enabled: bool


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    plan: str
    created_at: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)
