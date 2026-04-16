# Nexus API — Guía de Desarrollo

## Setup Rápido

```bash
cd api/

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu SECRET_KEY

# Poblar base de datos con datos de demo
python -m seed

# Iniciar servidor con hot-reload
uvicorn app.main:app --reload --port 8000
```

## Estructura del Proyecto

```
api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan, routers
│   ├── config.py            # Pydantic BaseSettings (.env)
│   ├── database.py          # SQLAlchemy async engine + session
│   │
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User (perfil, plan, password hash)
│   │   ├── organization.py  # Organization + Members con roles
│   │   ├── project.py       # Project (slug, descripción, repo)
│   │   ├── skill.py         # SkillDefinition + SkillConfiguration
│   │   ├── environment.py   # EnvironmentProfile (CLI profiles)
│   │   ├── audit.py         # AuditLog (inmutable)
│   │   └── subscription.py  # Subscription (Stripe-ready)
│   │
│   ├── schemas/             # Pydantic v2 request/response
│   │   ├── auth.py          # Register, Login, Token, UserResponse
│   │   ├── project.py       # Project, Environment, CLIProfile, Skill
│   │   └── dashboard.py     # DashboardStats, ActivityPoint, AuditEntry
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── auth_service.py  # JWT + bcrypt + register/login
│   │   ├── project_service.py # CRUD + freemium enforcement
│   │   └── stats_service.py # Dashboard aggregations
│   │
│   ├── routers/             # Endpoints REST
│   │   ├── auth.py          # /auth (4 endpoints)
│   │   ├── projects.py      # /projects (8 endpoints)
│   │   ├── skills.py        # /skills (3 endpoints)
│   │   ├── audit.py         # /audit (1 endpoint filtrable)
│   │   └── dashboard.py     # /dashboard (3 endpoints)
│   │
│   └── middleware/
│       └── auth.py          # JWT dependency (get_current_user)
│
├── seed.py                  # Script de datos de demo
├── requirements.txt
├── .env.example
└── nexus.db           # SQLite (auto-generada)
```

## Endpoints

### Auth (`/api/v1/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/register` | Crear cuenta + organización | No |
| `POST` | `/login` | Obtener JWT token | No |
| `GET` | `/me` | Perfil del usuario autenticado | Bearer |
| `PUT` | `/me` | Actualizar display_name, avatar | Bearer |

### Projects (`/api/v1/projects`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listar proyectos del usuario |
| `POST` | `/` | Crear proyecto (freemium check) |
| `GET` | `/{slug}` | Detalle con environments + skills |
| `PUT` | `/{slug}` | Actualizar nombre, descripción |
| `DELETE` | `/{slug}` | Soft delete |
| `GET` | `/{slug}/environments` | Listar entornos |
| `POST` | `/{slug}/environments` | Crear entorno con CLI profiles |
| `PUT` | `/{slug}/environments/{name}` | Actualizar entorno |

### Skills (`/api/v1/skills`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/catalog` | Catálogo global de skills |
| `GET` | `/projects/{slug}` | Skills del proyecto |
| `PUT` | `/projects/{slug}/{skill_id}` | Toggle/configurar skill |

### Audit (`/api/v1/audit`)

| Método | Ruta | Query Params |
|--------|------|-------------|
| `GET` | `/` | `action`, `success`, `project_id`, `limit`, `offset` |

### Dashboard (`/api/v1/dashboard`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/stats` | Total proyectos, switches hoy, skills 7d, tools |
| `GET` | `/activity?days=7` | Switches por día (para gráfica) |
| `GET` | `/recent?limit=10` | Últimos switches con nombre de proyecto |

## Autenticación

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@acme-corp.com","password":"password123"}'

# Response: {"access_token": "eyJ...", "user_id": "...", ...}

# 2. Usar el token
curl http://localhost:8000/api/v1/projects/ \
  -H "Authorization: Bearer eyJ..."
```

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./nexus.db` | Conexión BD |
| `SECRET_KEY` | `change-me...` | Clave para firmar JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Duración del token (24h) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Orígenes permitidos |
| `FREE_MAX_PROJECTS` | `3` | Límite plan free |
| `PREMIUM_MAX_PROJECTS` | `100` | Límite plan premium |

## Migración a PostgreSQL

Cambiar una línea en `.env`:

```env
# De:
DATABASE_URL=sqlite+aiosqlite:///./nexus.db

# A:
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nexus
```

> **Nota:** Instalar `asyncpg` adicional: `pip install asyncpg`
