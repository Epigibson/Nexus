"""Skills router — catalog and per-project config."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.skill import SkillDefinition, SkillConfiguration
from app.schemas.project import SkillSchema
from app.services.project_service import get_project_by_slug
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/skills", tags=["Skills"])


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
