"""Auth schemas — register, login, token."""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, examples=["dev@acme.com"])
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=100, examples=["Carlos Dev"])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$", v):
            raise ValueError("Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number")
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
