"""Audit router — filterable audit log."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.models.project import Project
from app.schemas.dashboard import AuditEntryResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/", response_model=list[AuditEntryResponse])
async def list_audit(
    action: str | None = Query(None),
    success: bool | None = Query(None),
    project_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar audit log con filtros opcionales."""
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action == action)
    if success is not None:
        query = query.where(AuditLog.success == success)
    if project_id:
        query = query.where(AuditLog.project_id == project_id)

    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()

    responses = []
    for e in entries:
        # Get project name if available
        project_name = ""
        if e.project_id:
            proj = await db.execute(select(Project.name).where(Project.id == e.project_id))
            project_name = proj.scalar_one_or_none() or ""

        responses.append(AuditEntryResponse(
            id=e.id,
            action=e.action,
            project_name=project_name,
            environment=e.environment,
            skill_name=None,
            message=e.message,
            success=e.success,
            duration_ms=e.duration_ms,
            created_at=e.created_at.isoformat() if e.created_at else "",
        ))

    return responses
