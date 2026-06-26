"""Skills router — catalog and per-project config."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.skill import SkillDefinition, SkillConfiguration
from app.schemas.project import SkillSchema, ProjectResponse
from app.services.project_service import get_project_by_slug, assign_default_skills, list_projects
from app.services.plan_enforcement import get_plan_limits, get_org_plan
from app.services.project_service import get_user_org_id, batch_get_switch_stats
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/skills", tags=["Skills"])


class SkillsOverview(BaseModel):
    catalog: list[SkillSchema]
    projects: list[ProjectResponse]
    plan: str
    limits: dict


@router.get("/overview", response_model=SkillsOverview)
async def skills_overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Endpoint combinado — devuelve catálogo, proyectos y plan en UNA sola petición."""
    import asyncio
    from app.routers.projects import _project_to_schema
    
    # Run queries in parallel
    catalog_task = db.execute(select(SkillDefinition).order_by(SkillDefinition.name))
    projects_task = list_projects(db, user.id)
    org_id_task = get_user_org_id(db, user.id)
    
    catalog_result, projects, org_id = await asyncio.gather(
        catalog_task, projects_task, org_id_task
    )
    
    skills = catalog_result.scalars().all()
    catalog = [
        SkillSchema(
            id=s.id, name=s.name, description=s.description,
            category=s.category, icon=s.icon,
            is_enabled=True, priority=10, is_premium=s.is_premium,
        )
        for s in skills
    ]
    
    plan = await get_org_plan(db, org_id) if org_id else "free"
    limits = get_plan_limits(plan)
    
    # Batch load switch stats
    project_ids = [p.id for p in projects]
    stats_map = await batch_get_switch_stats(db, project_ids)
    
    projects_data = [
        _project_to_schema(p, stats_map.get(p.id, {}), unmasked=False)
        for p in projects
    ]
    
    return SkillsOverview(
        catalog=catalog,
        projects=projects_data,
        plan=plan,
        limits=limits,
    )


@router.get("/catalog", response_model=list[SkillSchema])
async def catalog(db: AsyncSession = Depends(get_db)):
    """Catálogo global de skills disponibles (público)."""
    result = await db.execute(select(SkillDefinition).order_by(SkillDefinition.name))
    skills = result.scalars().all()
    return [
        SkillSchema(
            id=s.id, name=s.name, description=s.description,
            category=s.category, icon=s.icon,
            is_enabled=True, priority=10, is_premium=s.is_premium,
        )
        for s in skills
    ]


@router.get("/projects/{slug}", response_model=list[SkillSchema])
async def project_skills(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Skills configurados para un proyecto específico."""
    project = await get_project_by_slug(db, user.id, slug)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado")

    skills = []
    for sc in project.skill_configs:
        s = sc.skill
        if s:
            skills.append(SkillSchema(
                id=s.id, name=s.name, description=s.description,
                category=s.category, icon=s.icon,
                is_enabled=sc.is_enabled, priority=sc.priority,
                is_premium=s.is_premium,
            ))
    return skills


@router.post("/projects/{slug}/provision")
async def provision_skills(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Provisionar skills faltantes para un proyecto existente.

    Útil para proyectos creados antes de que se implementara la asignación
    automática de skills. Solo agrega skills que aún no están configurados.
    """
    project = await get_project_by_slug(db, user.id, slug)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado")

    count = await assign_default_skills(db, project.id)
    await db.commit()
    return {"status": "ok", "skills_provisioned": count}


@router.put("/projects/{slug}/{skill_id}")
async def toggle_skill(
    slug: str,
    skill_id: str,
    enabled: bool = True,
    priority: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Habilitar/deshabilitar un skill en un proyecto."""
    from app.services.plan_enforcement import check_premium_skill

    project = await get_project_by_slug(db, user.id, slug)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado")

    # Check if skill exists and if it's premium
    skill_result = await db.execute(
        select(SkillDefinition).where(SkillDefinition.id == skill_id)
    )
    skill_def = skill_result.scalar_one_or_none()
    if not skill_def:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill no encontrado")

    # Enforce premium skill restriction
    if enabled and skill_def.is_premium:
        try:
            await check_premium_skill(db, project.org_id, skill_def.is_premium)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # Find existing config
    result = await db.execute(
        select(SkillConfiguration).where(
            SkillConfiguration.project_id == project.id,
            SkillConfiguration.skill_id == skill_id,
        )
    )
    config = result.scalar_one_or_none()

    if config:
        config.is_enabled = enabled
        config.priority = priority
    else:
        config = SkillConfiguration(
            project_id=project.id, skill_id=skill_id,
            is_enabled=enabled, priority=priority,
        )
        db.add(config)

    await db.commit()
    return {"status": "ok", "skill_id": skill_id, "enabled": enabled, "priority": priority}

