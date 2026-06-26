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
        "category": SkillCategory.context_injection,
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
    {
        "name": "Docker Context",
        "description": "Cambia el contexto de Docker (docker context use) y configura DOCKER_HOST según el entorno.",
        "category": SkillCategory.container,
        "is_premium": False,
        "icon": "🐳",
        "version": "1.0.0",
    },
    {
        "name": "Kubernetes Context",
        "description": "Cambia el contexto de kubectl (kubectl config use-context) según el cluster configurado.",
        "category": SkillCategory.container,
        "is_premium": False,
        "icon": "☸️",
        "version": "1.0.0",
    },
    {
        "name": "Fly.io Context",
        "description": "Selecciona la app correcta de Fly.io (flyctl apps select) y configura el contexto.",
        "category": SkillCategory.cli_switching,
        "is_premium": False,
        "icon": "🪁",
        "version": "1.0.0",
    },
    {
        "name": "Railway Context",
        "description": "Cambia el proyecto de Railway (railway link) y configura variables de entorno.",
        "category": SkillCategory.cli_switching,
        "is_premium": False,
        "icon": "🚂",
        "version": "1.0.0",
    },
    {
        "name": "Netlify Context",
        "description": "Enlaza el site de Netlify (netlify link) y configura el entorno de despliegue.",
        "category": SkillCategory.cli_switching,
        "is_premium": False,
        "icon": "🔷",
        "version": "1.0.0",
    },

    # ─── Premium Skills (is_premium=True) ───
    {
        "name": "Script Runner",
        "description": "Ejecuta scripts pre/post switch: migrations, builds, seeds, health checks y cualquier comando shell automatizado.",
        "category": SkillCategory.scripts,
        "is_premium": True,
        "icon": "🚀",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "commands": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de comandos shell a ejecutar en orden",
                },
                "timeout": {
                    "type": "integer",
                    "default": 120,
                    "description": "Timeout en segundos por comando",
                },
            },
        },
    },
    {
        "name": "Auto Documentation",
        "description": "Genera un archivo NEXUS_CONTEXT.md con resumen automático del proyecto: variables, CLI tools, rama activa y skills configurados.",
        "category": SkillCategory.documentation,
        "is_premium": True,
        "icon": "📝",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "output_file": {
                    "type": "string",
                    "default": "NEXUS_CONTEXT.md",
                    "description": "Nombre del archivo de documentación generado",
                },
                "include_env_names": {
                    "type": "boolean",
                    "default": True,
                    "description": "Incluir nombres de variables de entorno (sin valores)",
                },
            },
        },
    },
    {
        "name": "Parallel Switch",
        "description": "Ejecuta todas las skills en paralelo con goroutines concurrentes para switches ultra-rápidos en monorepos.",
        "category": SkillCategory.parallel,
        "is_premium": True,
        "icon": "⚡",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "max_concurrency": {
                    "type": "integer",
                    "default": 5,
                    "description": "Número máximo de skills ejecutándose en paralelo",
                },
                "timeout": {
                    "type": "integer",
                    "default": 60,
                    "description": "Timeout global en segundos",
                },
            },
        },
    },
    {
        "name": "Cloud Audit Sync",
        "description": "Sincroniza el audit log local con la nube automáticamente en cada switch para compliance y trazabilidad.",
        "category": SkillCategory.cloud_audit,
        "is_premium": True,
        "icon": "☁️",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "sync_on_switch": {
                    "type": "boolean",
                    "default": True,
                    "description": "Sincronizar automáticamente al hacer switch",
                },
            },
        },
    },
    {
        "name": "Sandbox Environments",
        "description": "Crea entornos efímeros aislados para pruebas sin afectar configuraciones existentes.",
        "category": SkillCategory.sandbox,
        "is_premium": True,
        "icon": "🧪",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "auto_cleanup": {
                    "type": "boolean",
                    "default": True,
                    "description": "Limpiar entornos sandbox al salir",
                },
                "ttl_minutes": {
                    "type": "integer",
                    "default": 60,
                    "description": "Tiempo de vida del sandbox en minutos",
                },
            },
        },
    },
    {
        "name": "Team Context Sync",
        "description": "Sincroniza configuraciones de contexto entre miembros del equipo en tiempo real.",
        "category": SkillCategory.team_sync,
        "is_premium": True,
        "icon": "👥",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "broadcast_on_switch": {
                    "type": "boolean",
                    "default": True,
                    "description": "Notificar al equipo cuando cambias de contexto",
                },
            },
        },
    },
    {
        "name": "Secret Rotation",
        "description": "Rota automáticamente secrets y API keys con integración a vaults (AWS SSM, HashiCorp Vault, etc.).",
        "category": SkillCategory.secret_rotation,
        "is_premium": True,
        "icon": "🔐",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "vault_provider": {
                    "type": "string",
                    "enum": ["aws_ssm", "hashicorp_vault", "gcp_secret_manager"],
                    "description": "Proveedor de vault para rotación de secrets",
                },
                "rotation_interval_days": {
                    "type": "integer",
                    "default": 90,
                    "description": "Intervalo de rotación en días",
                },
            },
        },
    },
    # ─── New Premium Skills ───
    {
        "name": "Docker Compose Switch",
        "description": "Selecciona el archivo docker-compose.yml correcto y levanta los servicios del entorno activo.",
        "category": SkillCategory.container,
        "is_premium": True,
        "icon": "🐳",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "compose_file": {
                    "type": "string",
                    "default": "docker-compose.yml",
                    "description": "Ruta al archivo docker-compose",
                },
                "auto_start": {
                    "type": "boolean",
                    "default": False,
                    "description": "Levantar servicios automáticamente al hacer switch",
                },
            },
        },
    },
    {
        "name": "Health Check",
        "description": "Ejecuta health checks contra endpoints de tu aplicación para verificar que el entorno está operativo.",
        "category": SkillCategory.monitoring,
        "is_premium": True,
        "icon": "💓",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "endpoints": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "URLs a verificar",
                },
                "timeout": {
                    "type": "integer",
                    "default": 10,
                    "description": "Timeout por endpoint en segundos",
                },
                "retries": {
                    "type": "integer",
                    "default": 3,
                    "description": "Número de reintentos",
                },
            },
        },
    },
    {
        "name": "Database Migrator",
        "description": "Ejecuta migraciones de base de datos automáticamente al hacer switch (Prisma, Drizzle, Alembic, Knex, etc.).",
        "category": SkillCategory.database,
        "is_premium": True,
        "icon": "🗄️",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "orm": {
                    "type": "string",
                    "enum": ["prisma", "drizzle", "alembic", "knex", "sequelize", "typeorm", "flyway"],
                    "description": "ORM o herramienta de migración",
                },
                "command": {
                    "type": "string",
                    "description": "Comando personalizado de migración (opcional, override del ORM)",
                },
                "auto_migrate": {
                    "type": "boolean",
                    "default": True,
                    "description": "Ejecutar migraciones automáticamente",
                },
            },
        },
    },
    {
        "name": "GCloud Context",
        "description": "Cambia el proyecto de Google Cloud (gcloud config set project) y activa el service account correcto.",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "☁️",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "ID del proyecto de GCP",
                },
                "region": {
                    "type": "string",
                    "default": "us-central1",
                    "description": "Región por defecto",
                },
            },
        },
    },
    {
        "name": "Azure Context",
        "description": "Cambia la suscripción y resource group de Azure (az account set) según el entorno.",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "🔷",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "subscription_id": {
                    "type": "string",
                    "description": "ID de la suscripción de Azure",
                },
                "resource_group": {
                    "type": "string",
                    "description": "Resource group por defecto",
                },
            },
        },
    },
    {
        "name": "DigitalOcean Context",
        "description": "Selecciona el proyecto de DigitalOcean (doctl projects switch) y configura el access token.",
        "category": SkillCategory.cli_switching,
        "is_premium": True,
        "icon": "🌊",
        "version": "1.0.0",
    },
    {
        "name": "Terraform Workspace",
        "description": "Selecciona el workspace de Terraform (terraform workspace select) y configura el backend según el entorno.",
        "category": SkillCategory.scripts,
        "is_premium": True,
        "icon": "🏗️",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "workspace": {
                    "type": "string",
                    "description": "Nombre del workspace de Terraform",
                },
                "auto_init": {
                    "type": "boolean",
                    "default": True,
                    "description": "Ejecutar terraform init automáticamente",
                },
            },
        },
    },
    {
        "name": "Pulumi Stack",
        "description": "Selecciona el stack de Pulumi (pulumi stack select) y configura los secrets del entorno.",
        "category": SkillCategory.scripts,
        "is_premium": True,
        "icon": "📦",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "stack": {
                    "type": "string",
                    "description": "Nombre del stack de Pulumi",
                },
            },
        },
    },
    {
        "name": "Slack Notifier",
        "description": "Envía notificaciones a Slack cuando cambias de contexto para mantener al equipo informado.",
        "category": SkillCategory.notification,
        "is_premium": True,
        "icon": "💬",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "webhook_url": {
                    "type": "string",
                    "description": "URL del webhook de Slack",
                },
                "channel": {
                    "type": "string",
                    "description": "Canal de destino (opcional, override del webhook)",
                },
                "notify_on_switch": {
                    "type": "boolean",
                    "default": True,
                    "description": "Enviar notificación al hacer switch",
                },
            },
        },
    },
    {
        "name": "Discord Notifier",
        "description": "Envía notificaciones a Discord cuando cambias de contexto de desarrollo.",
        "category": SkillCategory.notification,
        "is_premium": True,
        "icon": "🎮",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "webhook_url": {
                    "type": "string",
                    "description": "URL del webhook de Discord",
                },
                "notify_on_switch": {
                    "type": "boolean",
                    "default": True,
                    "description": "Enviar notificación al hacer switch",
                },
            },
        },
    },
    {
        "name": "GitHub Copilot Context",
        "description": "Genera un .copilot-instructions.md con contexto del proyecto para GitHub Copilot.",
        "category": SkillCategory.documentation,
        "is_premium": True,
        "icon": "🤖",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "include_stack": {
                    "type": "boolean",
                    "default": True,
                    "description": "Incluir stack tecnológico",
                },
                "include_env_names": {
                    "type": "boolean",
                    "default": False,
                    "description": "Incluir nombres de variables de entorno",
                },
            },
        },
    },
    {
        "name": "SSL Certificate Check",
        "description": "Verifica la validez de los certificados SSL de los endpoints del proyecto y alerta si están por vencer.",
        "category": SkillCategory.security,
        "is_premium": True,
        "icon": "🔒",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "domains": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Dominios a verificar",
                },
                "warn_days": {
                    "type": "integer",
                    "default": 30,
                    "description": "Días antes de vencimiento para alertar",
                },
            },
        },
    },
    {
        "name": "Dependency Scanner",
        "description": "Escanea dependencias del proyecto en busca de vulnerabilidades conocidas (npm audit, pip-audit, etc.).",
        "category": SkillCategory.security,
        "is_premium": True,
        "icon": "🔍",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "auto_scan": {
                    "type": "boolean",
                    "default": True,
                    "description": "Ejecutar escaneo automáticamente al hacer switch",
                },
                "severity_threshold": {
                    "type": "string",
                    "enum": ["low", "moderate", "high", "critical"],
                    "default": "high",
                    "description": "Umbral mínimo de severidad para alertar",
                },
            },
        },
    },
    {
        "name": "Log Tail",
        "description": "Inicia el seguimiento de logs del entorno activo (CloudWatch, Datadog, etc.) en una terminal separada.",
        "category": SkillCategory.monitoring,
        "is_premium": True,
        "icon": "📋",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "provider": {
                    "type": "string",
                    "enum": ["cloudwatch", "datadog", "papertrail", "local"],
                    "default": "local",
                    "description": "Proveedor de logs",
                },
                "log_group": {
                    "type": "string",
                    "description": "Grupo de logs a seguir",
                },
            },
        },
    },
    {
        "name": "Cost Tracker",
        "description": "Muestra un resumen de costos estimados de la infraestructura del proyecto (AWS Cost Explorer, GCP Billing).",
        "category": SkillCategory.monitoring,
        "is_premium": True,
        "icon": "💰",
        "version": "1.0.0",
        "schema_": {
            "type": "object",
            "properties": {
                "provider": {
                    "type": "string",
                    "enum": ["aws", "gcp", "azure"],
                    "description": "Proveedor cloud para consultar costos",
                },
                "period_days": {
                    "type": "integer",
                    "default": 30,
                    "description": "Período de consulta en días",
                },
            },
        },
    },
]


async def seed_skills(db: AsyncSession) -> int:
    """Seed default skills. Adds missing skills without duplicating existing ones. Returns count of newly created skills."""
    # Get existing skill names
    result = await db.execute(select(SkillDefinition.name))
    existing_names = {row[0] for row in result.fetchall()}

    count = 0
    for skill_data in DEFAULT_SKILLS:
        if skill_data["name"] not in existing_names:
            skill = SkillDefinition(**skill_data)
            db.add(skill)
            count += 1

    if count > 0:
        await db.commit()
        print(f"Seeded {count} new skills into the database")
    return count
