# 🚀 Antigravity Control Center

> **Elimina la fricción del context switching.** Un solo comando para cambiar toda tu identidad de desarrollo — GitHub, AWS, Supabase, Vercel, MongoDB, y cada sesión CLI — instantáneamente.

## El Problema

Los desarrolladores que trabajan en múltiples proyectos pierden **horas por semana** iniciando y cerrando sesión en CLI tools:

```
gh auth switch → aws sso login → supabase link → vercel switch → mongosh --host ...
```

Cada proyecto tiene diferentes cuentas de GitHub, perfiles de AWS, orgs de Supabase, credenciales de bases de datos y API keys. **Antigravity lo arregla.**

## La Solución

```bash
# Un comando. Todos los CLIs. Todas las credenciales. Listo.
antigravity switch my-saas-app --env production
```

Este comando:
- ✅ Cambia tu cuenta de **GitHub** CLI
- ✅ Activa el perfil correcto de **AWS**
- ✅ Enlaza el proyecto correcto de **Supabase**
- ✅ Cambia el scope de **Vercel**
- ✅ Configura las conexiones de **MongoDB**
- ✅ Inyecta todas las **variables de entorno**
- ✅ Hace checkout a la **rama de Git** correcta
- ✅ Registra todo en un **audit trail inmutable**

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│              Antigravity CLI (Go)                    │
│  ┌──────────────────────────────────────────────┐    │
│  │          Skills Orchestrator                 │    │
│  │  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐      │    │
│  │  │ ENV  │ │ Git  │ │  CLI  │ │Audit │      │    │
│  │  │ Inj  │ │State │ │Switch │ │ Log  │      │    │
│  │  └──┬───┘ └──┬───┘ └──┬────┘ └──┬───┘      │    │
│  └─────┼────────┼────────┼─────────┼───────────┘    │
│        ▼        ▼        ▼         ▼                 │
│  ┌──────────────────────────────────────────────┐    │
│  │      CLI Profile Adapters                    │    │
│  │  gh · aws · supabase · vercel · mongosh      │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
         │                              ▲
         ▼                              │
┌────────────────────┐    ┌─────────────────────────┐
│  FastAPI Backend   │◄──►│  Dashboard (Next.js)    │
│  (:8000)           │    │  (:3000)                │
│  · JWT Auth        │    │  · Real-time stats      │
│  · REST API v1     │    │  · Project management   │
│  · Pydantic v2     │    │  · Audit log viewer     │
│  · SQLite/PgSQL    │    │  · CLI profile editor   │
└────────────────────┘    └─────────────────────────┘
```

## Quick Start

### CLI (Go)
```bash
# Inicializar un nuevo proyecto
antigravity init

# Editar tu antigravity.yaml con los detalles del proyecto

# Cambiar a un entorno de proyecto
antigravity switch my-project --env development

# Listar proyectos configurados
antigravity list

# Ver CLI profiles de un proyecto
antigravity profiles my-project
```

### Dashboard (Next.js)
```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

### Backend API (FastAPI)
```bash
cd api
pip install -r requirements.txt
cp .env.example .env

# Poblar base de datos con datos de demo
python -m seed

# Iniciar servidor
uvicorn app.main:app --reload
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

**Credenciales de demo:**
```
Email:    dev@acme-corp.com
Password: password123
```

## Stack Tecnológico

| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| Core CLI & Orchestrator | Go 1.26 (Cobra CLI) | ✅ Fase 1 |
| Dashboard | Next.js 16 + Tailwind v4 + shadcn/ui | ✅ Fase 2 |
| Backend API | FastAPI + Pydantic v2 + SQLAlchemy 2.0 | ✅ Fase 3 |
| Dashboard ↔ API | JWT Auth + REST fetch client | ✅ Fase 4 |
| Documentation | Mintlify (theme: palm) | ✅ |
| Database | SQLite (local) → Supabase (PostgreSQL + RLS) | 🔄 Migración pendiente |
| Encryption | AES-256-GCM + Argon2id | 📐 Diseñado |

### Documentación (Mintlify)
```bash
cd docs/
npx mintlify@latest dev
# → http://localhost:3333
```

## Estructura del Proyecto

```
antigravity/
├── .agents/               # AI agent skills, workflows & context
│   ├── context/           #   └── architecture.md (documentación técnica)
│   └── workflows/         #   └── add-cli-profiler.md
│
├── core/                  # Go CLI & Orchestrator (Arquitectura Hexagonal)
│   ├── cmd/main.go        #   Entrypoint
│   └── internal/
│       ├── domain/        #   Entidades: Project, Skill, CLIProfile
│       ├── port/          #   Interfaces: CLIProfiler, ConfigReader
│       ├── service/       #   Orchestrator: coordina skills
│       └── adapter/       #   Implementaciones: CLI, Config, Audit
│           ├── cli/       #     Comandos Cobra (init, switch, list)
│           ├── config/    #     YAML reader
│           ├── executor/  #     CLI profilers (gh, aws, supabase, vercel, mongo)
│           └── audit/     #     JSONL audit logger
│
├── api/                   # FastAPI Backend
│   ├── app/
│   │   ├── main.py        #   FastAPI app + CORS + lifecycle
│   │   ├── config.py      #   Pydantic BaseSettings
│   │   ├── database.py    #   SQLAlchemy async + session factory
│   │   ├── models/        #   ORM models (9 tablas)
│   │   ├── schemas/       #   Pydantic v2 request/response
│   │   ├── services/      #   Lógica de negocio
│   │   ├── routers/       #   Endpoints REST (6 routers, 20+ endpoints)
│   │   └── middleware/    #   JWT auth dependency
│   ├── seed.py            #   Datos de demo
│   └── requirements.txt
│
├── dashboard/             # Next.js 16 Web Dashboard
│   └── src/
│       ├── app/
│       │   ├── login/     #   Página de autenticación
│       │   └── dashboard/ #   Overview, Projects, Audit, Settings
│       ├── components/    #   shadcn/ui + custom components
│       └── lib/
│           ├── api.ts     #   Cliente HTTP tipado (15+ métodos)
│           └── auth-context.tsx  # JWT AuthProvider
│
├── database/              # Schema SQL & Migrations
│   └── migrations/        #   001_initial_schema.sql (9 tablas + RLS)
│
├── configs/               # Configuraciones de ejemplo
├── docs/                  # Documentación técnica
└── antigravity.yaml       # Configuración de ejemplo raíz
```

## API Endpoints

Todos los endpoints están bajo `/api/v1/` y documentados en Swagger UI (`/docs`).

| Tag | Endpoints | Auth |
|-----|-----------|------|
| **Auth** | `POST /register`, `POST /login`, `GET /me`, `PUT /me` | Público / Bearer |
| **Projects** | CRUD + environments (8 endpoints) | Bearer |
| **Skills** | Catálogo + config per-project (3 endpoints) | Bearer |
| **Audit** | Log filtrable + export (1 endpoint) | Bearer |
| **Dashboard** | Stats, actividad, recientes (3 endpoints) | Bearer |
| **Health** | 2 health checks | Público |

## Licencia

MIT © Antigravity Dev
