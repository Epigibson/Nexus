"""Plan enforcement utilities — centralized limit checking."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.environment import EnvironmentProfile


def get_plan_limits(plan: str) -> dict:
    """Get all limits for a given plan tier."""
    if plan == "enterprise":
        return {
            "max_projects": 999999,
            "max_cli_tools": 999999,
            "max_members": 999999,
            "skills_parallel": True,
            "skills_auto": True,
            "script_runners": True,
            "audit_cloud": True,
            "team_management": True,
        }
    if plan == "premium":
        return {
            "max_projects": settings.premium_max_projects,
            "max_cli_tools": settings.premium_max_cli_tools,
            "max_members": settings.premium_max_members,
            "skills_parallel": True,
            "skills_auto": True,
            "script_runners": True,
            "audit_cloud": True,
            "team_management": True,
        }
    # Free tier (default)
    return {
        "max_projects": settings.free_max_projects,
        "max_cli_tools": settings.free_max_cli_tools,
        "max_members": settings.free_max_members,
        "skills_parallel": False,
        "skills_auto": False,
        "script_runners": False,
        "audit_cloud": False,
        "team_management": False,
    }


async def get_org_plan(db: AsyncSession, org_id: str) -> str:
    """Get the plan for an organization."""
    result = await db.execute(
        select(Organization.plan).where(Organization.id == org_id)
    )
    return result.scalar_one_or_none() or "free"


async def check_project_limit(db: AsyncSession, org_id: str) -> None:
    """Raise ValueError if org has reached their project limit."""
    plan = await get_org_plan(db, org_id)
    limits = get_plan_limits(plan)

    count = await db.execute(
        select(func.count(Project.id)).where(
            Project.org_id == org_id, Project.is_active == True
        )
    )
    current = count.scalar() or 0

    if current >= limits["max_projects"]:
        raise ValueError(
            f"Límite del plan '{plan}': máximo {limits['max_projects']} proyectos. "
            "Actualiza a Premium para crear más."
        )


async def check_cli_tools_limit(db: AsyncSession, org_id: str, project_id: str, new_profiles_count: int = 1) -> None:
    """Raise ValueError if adding CLI tools would exceed the plan limit."""
    plan = await get_org_plan(db, org_id)
    limits = get_plan_limits(plan)

    # Count existing CLI profiles across all environments of this project
    result = await db.execute(
        select(EnvironmentProfile.cli_profiles).where(
            EnvironmentProfile.project_id == project_id
        )
    )
    envs = result.scalars().all()
    total_tools = sum(len(profiles or []) for profiles in envs)

    if total_tools + new_profiles_count > limits["max_cli_tools"]:
        raise ValueError(
            f"Límite del plan '{plan}': máximo {limits['max_cli_tools']} CLI tools. "
            "Actualiza a Premium para agregar más."
        )


async def check_member_limit(db: AsyncSession, org_id: str) -> None:
    """Raise ValueError if org has reached their member limit."""
    plan = await get_org_plan(db, org_id)
    limits = get_plan_limits(plan)

    count = await db.execute(
        select(func.count()).where(OrganizationMember.org_id == org_id)
    )
    current = count.scalar() or 0

    if current >= limits["max_members"]:
        raise ValueError(
            f"Límite del plan '{plan}': máximo {limits['max_members']} miembros. "
            "Actualiza a Premium para invitar más."
        )


async def check_premium_skill(db: AsyncSession, org_id: str, is_premium_skill: bool) -> None:
    """Raise ValueError if trying to enable a premium skill on free plan."""
    if not is_premium_skill:
        return
    plan = await get_org_plan(db, org_id)
    if plan not in ("premium", "enterprise"):
        raise ValueError(
            "Los skills premium requieren el plan Premium. "
            "Actualiza tu plan para habilitar este skill."
        )


async def upgrade_org_to_premium(db: AsyncSession, org_id: str) -> None:
    """Upgrade an organization's plan and limits to premium."""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org:
        org.plan = "premium"
        org.max_projects = settings.premium_max_projects
        org.max_members = settings.premium_max_members
