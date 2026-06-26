"""Dashboard router — stats & activity."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStats, ActivityPoint, RecentSwitch
from app.services.stats_service import get_stats, get_activity, get_recent_switches
from app.services.project_service import list_projects
from app.services.plan_enforcement import get_plan_limits, get_org_plan
from app.services.project_service import get_user_org_id
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardOverview(BaseModel):
    stats: DashboardStats
    activity: list[ActivityPoint]
    recent: list[RecentSwitch]
    projects_count: int
    plan: str
    limits: dict


@router.get("/overview", response_model=DashboardOverview)
async def overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Endpoint combinado — devuelve stats, actividad, switches recientes y plan en UNA sola petición."""
    import asyncio
    
    # Run all queries in parallel
    stats_task = get_stats(db, user.id)
    activity_task = get_activity(db, user.id, 7)
    recent_task = get_recent_switches(db, user.id, 5)
    org_id_task = get_user_org_id(db, user.id)
    
    stats_data, activity_data, recent_data, org_id = await asyncio.gather(
        stats_task, activity_task, recent_task, org_id_task
    )
    
    plan = await get_org_plan(db, org_id) if org_id else "free"
    limits = get_plan_limits(plan)
    
    return DashboardOverview(
        stats=DashboardStats(**stats_data),
        activity=[ActivityPoint(**d) for d in activity_data],
        recent=[RecentSwitch(**d) for d in recent_data],
        projects_count=stats_data.get("total_projects", 0),
        plan=plan,
        limits=limits,
    )


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
