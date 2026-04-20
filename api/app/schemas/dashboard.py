"""Audit and Dashboard schemas."""

from pydantic import BaseModel, Field


class AuditEntryResponse(BaseModel):
    id: str
    action: str
    project_name: str | None = None
    environment: str | None = None
    skill_name: str | None = None
    message: str
    success: bool
    duration_ms: int | None
    created_at: str

    model_config = {"from_attributes": True}


class AuditCreate(BaseModel):
    action: str
    project_name: str | None = None
    environment: str | None = None
    skill_name: str | None = None
    message: str
    success: bool
    duration_ms: int | None = None


class AuditFilter(BaseModel):
    project_id: str | None = None
    action: str | None = None
    success: bool | None = None
    limit: int = Field(default=50, le=200)
    offset: int = Field(default=0, ge=0)


class DashboardStats(BaseModel):
    total_projects: int
    switches_today: int
    skills_executed: int
    tools_connected: int


class ActivityPoint(BaseModel):
    day: str
    switches: int


class RecentSwitch(BaseModel):
    id: str
    project_name: str
    environment: str
    message: str
    success: bool
    duration_ms: int | None
    created_at: str
