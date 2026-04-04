# Antigravity — Documentación Técnica de Arquitectura

## Vista General del Sistema

Antigravity es un **Centro de Control de Entornos de Desarrollo** basado en un Motor de Skills. Su propósito es eliminar la fricción del "context switching" para desarrolladores, automatizando la configuración de terminales, cuentas de nube, variables de entorno y ramas de Git al cambiar de proyecto.

### Componentes Principales

```
┌─────────────┐     REST/JWT      ┌──────────────────┐
│  Dashboard  │◄─────────────────►│  Backend API     │
│  Next.js    │     :3000←→:8000  │  FastAPI          │
└──────┬──────┘                   └────────┬─────────┘
       │                                   │
       │  (futuro: API key sync)           │  SQLite/PostgreSQL
       │                                   │
┌──────▼──────┐                   ┌────────▼─────────┐
│  CLI (Go)   │                   │  Base de Datos   │
│  Binario    │                   │  9 tablas + RLS  │
└─────────────┘                   └──────────────────┘
```

---

## Fase 1: Core CLI (Go) — ✅ COMPLETADA

### Objetivo
Crear el motor CLI que permite cambiar toda la identidad de desarrollo (GitHub, AWS, Supabase, Vercel, MongoDB) con un solo comando.

### Entregables
- **Monorepo** con estructura hexagonal: `core/` (Go), `dashboard/`, `api/`, `database/`, `.agents/`
- **CLI funcional** con comandos: `init`, `switch`, `list`, `profiles`, `version`
- **5 CLI Profilers**: GitHub (`gh auth switch`), AWS (`aws sso login`), Supabase (`supabase link`), Vercel (`vercel switch`), MongoDB (`atlas config set`)
- **Audit Log inmutable** en `~/.antigravity/audit.jsonl` (JSON Lines append-only)
- **Schema de BD** con 9 tablas, RLS, triggers, y enforcement de freemium a nivel de base de datos
- **Generación de scripts** PowerShell/Bash para inyección de env vars

### Stack
- Go 1.26 + Cobra CLI + YAML v3
- Arquitectura Hexagonal: Domain → Ports → Service → Adapters
- PostgreSQL (Supabase) con RLS

### Arquitectura Hexagonal (Go)
```
domain/         Entidades puras (Project, Skill, CLIProfile, AuditEntry)
                → 0 dependencias externas

port/           Interfaces (CLIProfiler, ConfigReader, AuditLogger, ScriptGenerator)
                → Solo depende de domain

service/        Orchestrator — coordina skills en secuencia
                → Depende de port, domain

adapter/        Implementaciones concretas
├── cli/        Comandos Cobra (init, switch, list, profiles)
├── config/     YAML reader (flat structure)
├── executor/   CLI profilers (gh, aws, supabase, vercel, mongosh)
├── audit/      JSONL append-only file logger
└── script/     PowerShell/Bash env var scripts
```

### Flujo de un Switch
```
antigravity switch saas-platform --env development
    │
    ├─ 1. Leer antigravity.yaml → obtener Environment "development"
    ├─ 2. Skill: Inyectar env vars (genera script PowerShell/Bash)
    ├─ 3. Skill: Git switch (git checkout develop)
    ├─ 4. Skill: CLI switch
    │     ├─ gh auth switch --user dev-personal
    │     ├─ aws sso login --profile acme-dev
    │     ├─ supabase link --project-ref saas-dev-ref
    │     ├─ vercel switch saas-dev
    │     └─ mongosh (set connection string)
    └─ 5. Audit: Append a ~/.antigravity/audit.jsonl
```

### Verificación
- `go build ./...` ✅
- `go vet ./...` ✅
- `antigravity switch --env dev` ✅ (ejecuta switch completo con audit)

---

## Fase 2: Dashboard Web — ✅ COMPLETADA

### Objetivo  
Dashboard premium para gestión visual de proyectos, entornos, perfiles CLI y audit log.

### Entregables
- **5 páginas**: Overview, Proyectos, Detalle Proyecto, Audit Log, Settings
- **Sidebar colapsable** con navegación, CLI hint, avatar y toggle dark/light
- **Tema Premium** dark-mode-first con paleta violeta/teal
- **Stats cards** animadas con tendencias
- **Gráfica de actividad** semanal (Recharts)
- **Tabla de audit** filtrable por acción/estado
- **Detalle de proyecto** con tabs: Entornos, Skills, Actividad
- **CLI profiles visuales** con indicadores de estado (connected/disconnected/expired)
- **Settings** con perfil, seguridad Zero-Knowledge, y pricing cards freemium

### Stack
- Next.js 16.2 (App Router, React 19)
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui (base-nova style)
- Recharts (gráficas)
- next-themes (dark/light)
- Lucide icons

### Estructura de Carpetas
```
dashboard/src/
├── app/
│   ├── layout.tsx          (root: fonts, theme, AuthProvider, TooltipProvider)
│   ├── page.tsx            (redirect condicional → /login o /dashboard)
│   ├── login/page.tsx      (página de autenticación premium)
│   └── dashboard/
│       ├── layout.tsx      (sidebar + auth guard + main content)
│       ├── page.tsx        (overview: stats, chart, recent)
│       ├── projects/
│       │   ├── page.tsx    (grid de cards)
│       │   └── [slug]/page.tsx (detalle con tabs)
│       ├── audit/page.tsx  (tabla filtrable)
│       └── settings/page.tsx (perfil, tema, seguridad, plan)
├── components/
│   ├── ui/                 (shadcn base components)
│   ├── theme-provider.tsx
│   └── dashboard/
│       └── activity-chart.tsx
├── lib/
│   ├── api.ts              (cliente HTTP tipado — 15+ métodos)
│   ├── auth-context.tsx    (AuthProvider: JWT en localStorage)
│   ├── types.ts            (domain types en TS)
│   └── utils.ts            (cn utility)
```

### Verificación
- `npm run build` ✅ (0 errores TypeScript, 9 rutas)
- Todas las rutas generadas correctamente
- Demo visual verificado en browser

---

## Fase 3: Backend API (FastAPI) — ✅ COMPLETADA

### Objetivo
Backend REST API con autenticación JWT, validaciones Pydantic v2, y 20+ endpoints para gestión de proyectos, skills, audit, y dashboard.

### Stack
| Componente | Tecnología |
|-----------|-----------|
| Framework | FastAPI 0.115+ |
| Validación | Pydantic v2 |
| ORM | SQLAlchemy 2.0 (async) |
| BD Local | SQLite (aiosqlite) |
| Auth | python-jose (JWT) + bcrypt |
| Server | Uvicorn (hot-reload) |

### Arquitectura de 3 Capas
```
Routers (endpoints)  →  Reciben HTTP, validan con Pydantic, delegan a services
Services (negocio)   →  Lógica de negocio, freemium enforcement, queries
Models (ORM)         →  SQLAlchemy declarative, mirror del SQL schema

Middleware:
  auth.py            →  get_current_user dependency (JWT HTTPBearer)
```

### Modelos SQLAlchemy (9 tablas)
| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `User` | `users` | Perfil con plan tier (free/premium/enterprise) |
| `Organization` | `organizations` | Multi-tenancy, límites por plan |
| `OrganizationMember` | `organization_members` | Roles: owner/admin/member |
| `Project` | `projects` | Slug unique por org, soft delete |
| `SkillDefinition` | `skill_definitions` | Catálogo global (5 skills) |
| `SkillConfiguration` | `skill_configurations` | Config per-project |
| `EnvironmentProfile` | `environment_profiles` | CLI profiles como JSON |
| `AuditLog` | `audit_logs` | Inmutable, append-only |
| `Subscription` | `subscriptions` | Stripe-ready |

### Endpoints API (20+)
| Router | Prefix | Endpoints | Auth |
|--------|--------|-----------|------|
| Auth | `/api/v1/auth` | `POST /register`, `POST /login`, `GET /me`, `PUT /me` | Público/Bearer |
| Projects | `/api/v1/projects` | CRUD + environments (8 endpoints) | Bearer |
| Skills | `/api/v1/skills` | Catálogo + per-project config (3 endpoints) | Bearer |
| Audit | `/api/v1/audit` | Log filtrable con paginación (1 endpoint) | Bearer |
| Dashboard | `/api/v1/dashboard` | Stats, actividad, recientes (3 endpoints) | Bearer |
| Health | `/`, `/api/v1/health` | Health checks (2 endpoints) | Público |

### Freemium Enforcement
```python
# En project_service.py — se valida ANTES de crear:
max_projects = settings.free_max_projects if org.plan == "free" else settings.premium_max_projects
if project_count >= max_projects:
    raise ValueError(f"Plan '{org.plan}' limit reached")
```

### Seed Data
El script `seed.py` crea datos idénticos a los mock del dashboard:
- 1 usuario: `dev@acme-corp.com` / `password123`
- 1 organización: "Carlos Dev's Workspace"
- 3 proyectos: SaaS Platform, Mobile API, Landing Page
- 5 skills: Context Injection, Git State, CLI Switching, Documentation, Sandboxes
- 7 entornos: con CLI profiles de 5 herramientas
- 10 audit entries: con variedad de acciones y estados

### Verificación
- `python -m seed` ✅ (datos creados correctamente)
- `uvicorn app.main:app --reload` ✅ (servidor en :8000)
- Swagger UI (`/docs`) ✅ (20+ endpoints documentados)
- Login + listar proyectos via curl ✅

---

## Fase 4: Dashboard ↔ API Integration — ✅ COMPLETADA

### Objetivo
Conectar el dashboard a datos reales del API, reemplazando todos los mock data por fetch calls con JWT auth.

### Cambios Realizados

#### Nuevos Archivos
| Archivo | Propósito |
|---------|-----------|
| `src/lib/api.ts` | Cliente HTTP tipado con 15+ métodos y auto-redirect en 401 |
| `src/lib/auth-context.tsx` | AuthProvider: JWT en localStorage, restore de sesión, login/register/logout |
| `src/app/login/page.tsx` | Página de login premium con glow background, demo credentials hint |

#### Páginas Reescritas (mock → API real)
| Página | Antes | Después |
|--------|-------|---------|
| `page.tsx` (root) | `redirect("/dashboard")` | Redirect condicional: token → dashboard, no → login |
| `dashboard/layout.tsx` | Datos hardcoded del user | Auth context + auth guard + logout |
| `dashboard/page.tsx` | `mockProjects`, `mockStats` | `api.getStats()`, `api.getActivity()`, `api.getRecentSwitches()` |
| `projects/page.tsx` | `mockProjects` array | `api.listProjects()` con loading state |
| `projects/[slug]/page.tsx` | `find()` en mock array | `api.getProject(slug)` como client component |
| `audit/page.tsx` | `mockAuditLog` array | `api.listAudit()` con filtros server-side |
| `settings/page.tsx` | Datos estáticos | Auth context + `api.updateProfile()` con feedback visual |

### Flujo de Autenticación
```
1. User visita /                    → redirect a /login (sin token) o /dashboard (con token)
2. Login page                       → POST /api/v1/auth/login → JWT token
3. AuthProvider                     → Guarda token en localStorage
4. Dashboard layout                 → Auth guard → redirect a /login si no hay token
5. Cada página                      → api.ts usa Authorization: Bearer <token>
6. Token expirado                   → 401 → auto-redirect a /login
7. Logout                           → Limpia localStorage → redirect a /login
```

### Verificación
- `npm run build` ✅ (0 errores TypeScript, 9 rutas)
- Login flow completo (browser test) ✅
- Overview con datos reales ✅
- Proyectos listados desde BD ✅
- Detalle de proyecto con CLI profiles ✅
- Auth guard funcional ✅

---

## Fase 5: Features Premium (PENDIENTE)

### Objetivo
Implementar skills premium: Sandboxes efímeros, Documentación auto, Orquestación paralela.

### Alcance Estimado
- Sandboxes: crear entornos efímeros aislados
- Documentación automática: generar docs desde metadatos
- Orquestación paralela: ejecutar skills en paralelo vs secuencial
- Stripe webhooks para gestión de suscripciones

---

## Fase 6: Supabase + Producción (PENDIENTE)

### Objetivo
Migrar de SQLite local a Supabase PostgreSQL y preparar para deployment.

### Alcance Estimado
- Cambiar `DATABASE_URL` a PostgreSQL Supabase
- Integrar Supabase Auth (reemplazar JWT local)
- Aplicar RLS policies del schema SQL
- Deploy del dashboard en Vercel
- Deploy del API en Railway/Fly.io

---

## Decisiones de Diseño

### ¿Por qué Go para el CLI?
- Binarios estáticos, rápidos y seguros
- Cross-compilation trivial (Windows, Mac, Linux)
- Cobra CLI es el estándar de la industria

### ¿Por qué FastAPI para el API?
- Validación automática con Pydantic v2
- Swagger UI auto-generado
- Async nativo para concurrencia alta
- Python ecosystem amplio para ML/AI futuro

### ¿Por qué SQLite primero?
- 0 dependencias externas para desarrollo local
- Migración a PostgreSQL = cambiar 1 línea en `.env`
- Los modelos SQLAlchemy son agnósticos al motor

### ¿Por qué JWT local en vez de Supabase Auth?
- Desarrollo offline sin depender de servicios externos
- La interfaz es idéntica: `Authorization: Bearer <token>`
- Swap a Supabase Auth = cambiar el middleware de validación

### Seguridad Zero-Knowledge (Diseñada)
```
Secretos del usuario → Encrypt(AES-256-GCM, key=Argon2id(master_password))
                     → Solo el ciphertext viaja al server
                     → El server NUNCA ve la master password ni los secretos en claro
```

---

## Puertos por Defecto

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Dashboard | http://localhost:3000 | Next.js dev server |
| API | http://localhost:8000 | FastAPI Uvicorn |
| Swagger UI | http://localhost:8000/docs | Documentación interactiva |
| ReDoc | http://localhost:8000/redoc | Documentación alternativa |
