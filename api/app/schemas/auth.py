"""Auth schemas — register, login, token."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, examples=["dev@acme.com"])
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=100, examples=["Carlos Dev"])


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
