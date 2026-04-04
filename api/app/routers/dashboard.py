"""Dashboard router — stats & activity."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStats, ActivityPoint, RecentSwitch
from app.services.stats_service import get_stats, get_activity, get_recent_switches
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Estadísticas globales del dashboard."""
    data = await get_stats(db, user.id)
    return DashboardStats(**data)


@router.get("/activity", response_model=list[ActivityPoint])
async def activity(
    days: int = 7,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Actividad (switches por día)."""
    data = await get_activity(db, user.id, days)
    return [ActivityPoint(**d) for d in data]


@router.get("/recent", response_model=list[RecentSwitch])
async def recent(
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Últimos switches."""
    data = await get_recent_switches(db, user.id, limit)
    return [RecentSwitch(**d) for d in data]
