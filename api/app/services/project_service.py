"""Project service — CRUD with freemium enforcement."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.skill import SkillConfiguration

from app.models.project import Project
from app.models.organization import Organization, OrganizationMember
from app.models.audit import AuditLog
from app.config import settings


async def get_user_org_id(db: AsyncSession, user_id: str) -> str | None:
    """Get the user's primary organization ID."""
    result = await db.execute(
        select(OrganizationMember.org_id)
        .where(OrganizationMember.user_id == user_id)
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row


async def list_projects(db: AsyncSession, user_id: str) -> list[Project]:
    """List all projects for the user's organization."""
    org_id = await get_user_org_id(db, user_id)
    if not org_id:
        return []

    result = await db.execute(
        select(Project)
        .where(Project.org_id == org_id, Project.is_active == True)
        .options(
            selectinload(Project.environments),
            selectinload(Project.skill_configs).selectinload(SkillConfiguration.skill),
        )
        .order_by(Project.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_project_by_slug(db: AsyncSession, user_id: str, slug: str) -> Project | None:
    """Get a single project by slug, ensuring ownership."""
    org_id = await get_user_org_id(db, user_id)
    if not org_id:
        return None

    result = await db.execute(
        select(Project)
        .where(Project.org_id == org_id, Project.slug == slug, Project.is_active == True)
        .options(
            selectinload(Project.environments),
            selectinload(Project.skill_configs).selectinload(SkillConfiguration.skill),
        )
    )
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, user_id: str, name: str, slug: str,
                         description: str | None = None, repo_url: str | None = None) -> Project:
    """Create a project with freemium enforcement."""
    org_id = await get_user_org_id(db, user_id)
    if not org_id:
        raise ValueError("User has no organization")

    # Freemium check
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one()

    count_result = await db.execute(
        select(func.count(Project.id)).where(Project.org_id == org_id, Project.is_active == True)
    )
    project_count = count_result.scalar() or 0

    max_projects = settings.free_max_projects if org.plan == "free" else settings.premium_max_projects
    if project_count >= max_projects:
        raise ValueError(f"Plan '{org.plan}' limit reached: {max_projects} projects max. Upgrade to create more.")

    # Check slug uniqueness within org
    existing = await db.execute(
        select(Project).where(Project.org_id == org_id, Project.slug == slug)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Project slug '{slug}' already exists")

    project = Project(
        org_id=org_id, name=name, slug=slug,
        description=description, repo_url=repo_url,
    )
    db.add(project)
    await db.flush()  # Get the project ID before assigning skills

    # Auto-assign all free skills to the new project
    await assign_default_skills(db, project.id)

    return project


async def assign_default_skills(db: AsyncSession, project_id: str) -> int:
    """Assign all free SkillDefinitions to a project (enabled by default).

    If skills already exist for this project, only missing ones are added.
    Returns count of newly assigned skills.
    """
    from app.models.skill import SkillDefinition, SkillConfiguration

    # Get all skill definitions
    all_skills_result = await db.execute(select(SkillDefinition))
    all_skills = all_skills_result.scalars().all()

    # Get existing configurations for this project
    existing_result = await db.execute(
        select(SkillConfiguration.skill_id)
        .where(SkillConfiguration.project_id == project_id)
    )
    existing_ids = {row for row in existing_result.scalars().all()}

    count = 0
    for skill in all_skills:
        if skill.id not in existing_ids:
            config = SkillConfiguration(
                project_id=project_id,
                skill_id=skill.id,
                is_enabled=True,
                priority=10,
            )
            db.add(config)
            count += 1

    return count


async def update_project(db: AsyncSession, project: Project, **kwargs) -> Project:
    for key, value in kwargs.items():
        if value is not None and hasattr(project, key):
            setattr(project, key, value)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    """Soft delete."""
    project.is_active = False


async def get_project_switch_count(db: AsyncSession, project_id: str) -> int:
    result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.project_id == project_id,
            AuditLog.action == "context_switch"
        )
    )
    return result.scalar() or 0


async def get_project_last_switch(db: AsyncSession, project_id: str) -> str | None:
    result = await db.execute(
        select(AuditLog.created_at).where(
            AuditLog.project_id == project_id,
            AuditLog.action == "context_switch"
        ).order_by(AuditLog.created_at.desc()).limit(1)
    )
    row = result.scalar_one_or_none()
    return row.isoformat() if row else None


async def batch_get_switch_stats(db: AsyncSession, project_ids: list[str]) -> dict:
    """Batch-load switch counts and last switch times for multiple projects.

    Returns dict: {project_id: {"count": int, "last_switch": str | None}}
    Eliminates N+1: 1 query total instead of 2 per project.
    """
    if not project_ids:
        return {}

    result = await db.execute(
        select(
            AuditLog.project_id,
            func.count(AuditLog.id).label("cnt"),
            func.max(AuditLog.created_at).label("last_at"),
        )
        .where(
            AuditLog.project_id.in_(project_ids),
            AuditLog.action == "context_switch",
        )
        .group_by(AuditLog.project_id)
    )

    stats_map = {
        row.project_id: {
            "count": row.cnt,
            "last_switch": row.last_at.isoformat() if row.last_at else None,
        }
        for row in result.all()
    }

    return {
        pid: stats_map.get(pid, {"count": 0, "last_switch": None})
        for pid in project_ids
    }

