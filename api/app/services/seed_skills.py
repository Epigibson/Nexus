"""Seed default skill definitions into the database."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import SkillDefinition, SkillCategory


DEFAULT_SKILLS = [
    # ─── Free Skills (is_premium=False) ───
    {
        "name": "Git Context",
        "description": "Detecta la rama actual, último commit y estado del working tree al cambiar de contexto.",
        "category": SkillCategory.git_state,
        "is_premium": False,
        "icon": "🔀",
        "version": "1.0.0",
    },
    {
        "name": "Env Injector",
        "description": "Inyecta variables de entorno del perfil seleccionado automáticamente en tu terminal.",
        "category": SkillCategory.cli_switching,
        "is_premium": False,
        "icon": "💉",
        "version": "1.0.0",
    },
    {
        "name": "Branch Switcher",
        "description": "Cambia automáticamente a la rama Git configurada para cada entorno.",
        "category": SkillCategory.git_state,
        "is_premium": False,
        "icon": "🌿",
        "version": "1.0.0",
    },
    {
        "name": "CLI Profiler",
        "description": "Configura herramientas CLI (AWS, Stripe, Supabase, etc.) según el perfil activo.",
        "category": SkillCategory.cli_switching,
        "is_premium": False,
        "icon": "⚡",
        "version": "1.0.0",
    },
    {
        "name": "Context Snapshot",
        "description": "Guarda una snapshot del estado actual antes de cambiar de proyecto.",
        "category": SkillCategory.context_injection,
        "is_premium": False,
        "icon": "📸",
        "version": "1.0.0",
    },

    # ─── Premium Skills (is_premium=True) ───
    {
        "name": "Auto Documentation",
        "description": "Genera documentación automática del proyecto incluyendo variables de entorno, endpoints y dependencias.",
        "category": SkillCategory.documentation,
        "is_premium": True,
        "icon": "📝",
        "version": "1.0.0",
    },
    {
        "name": "Script Runner",
        "description": "Ejecuta scripts pre/post switch: migrations, builds, seeds, health checks, etc.",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "🚀",
        "version": "1.0.0",
    },
    {
        "name": "Parallel Switch",
        "description": "Cambia múltiples servicios en paralelo para mono-repos y micro-servicios.",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "⚡",
        "version": "1.0.0",
    },
    {
        "name": "Cloud Audit Sync",
        "description": "Sincroniza el audit log local con almacenamiento en la nube para compliance y auditoría.",
        "category": SkillCategory.context_injection,
        "is_premium": True,
        "icon": "☁️",
        "version": "1.0.0",
    },
    {
        "name": "Sandbox Environments",
        "description": "Crea entornos efímeros aislados para pruebas sin afectar configuraciones existentes.",
        "category": SkillCategory.sandbox,
        "is_premium": True,
        "icon": "🧪",
        "version": "1.0.0",
    },
    {
        "name": "Team Context Sync",
        "description": "Sincroniza configuraciones de contexto entre miembros del equipo en tiempo real.",
        "category": SkillCategory.context_injection,
        "is_premium": True,
        "icon": "👥",
        "version": "1.0.0",
    },
    {
        "name": "Secret Rotation",
        "description": "Rota automáticamente secrets y API keys con integración a vaults (AWS SSM, Vault, etc.).",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "🔐",
        "version": "1.0.0",
    },
]


async def seed_skills(db: AsyncSession) -> int:
    """Seed default skills if the table is empty. Returns count of created skills."""
    result = await db.execute(select(SkillDefinition).limit(1))
    if result.scalar_one_or_none():
        return 0  # Already seeded

    count = 0
    for skill_data in DEFAULT_SKILLS:
        skill = SkillDefinition(**skill_data)
        db.add(skill)
        count += 1

    await db.commit()
    print(f"🌱 Seeded {count} skills into the database")
    return count
