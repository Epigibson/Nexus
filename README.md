# 🚀 Nexus Control Center

> **Elimina la fricción del context switching.** Un solo comando para cambiar toda tu identidad de desarrollo — GitHub, AWS, Supabase, Vercel, Expo, MongoDB, y cada sesión CLI — en ~5 segundos.

## El Problema

Los desarrolladores que trabajan en múltiples proyectos pierden **horas por semana** iniciando y cerrando sesión en CLI tools:

```
gh auth switch → aws sso login → supabase link → vercel switch → mongosh --host ...
```

Cada proyecto tiene diferentes cuentas de GitHub, perfiles de AWS, orgs de Supabase, credenciales de bases de datos y API keys. **Nexus lo arregla.**

## La Solución

```bash
# Un comando. Todos los CLIs. Todas las credenciales. Listo.
nexus switch my-saas-app --env production
```

Este comando:
- ✅ Cambia tu cuenta de **GitHub** CLI
- ✅ Activa el perfil correcto de **AWS**
- ✅ Enlaza el proyecto correcto de **Supabase**
- ✅ Cambia el scope de **Vercel**
- ✅ Autentica tu cuenta de **Expo/EAS**
- ✅ Configura las conexiones de **MongoDB**
- ✅ Inyecta todas las **variables de entorno**
- ✅ Hace checkout a la **rama de Git** correcta
- ✅ Registra todo en un **audit trail inmutable**
- ⚡ Todo en **paralelo** — ~5 segundos total

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│              Nexus CLI (Go)                    │
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
│  │  gh · aws · supabase · vercel · expo/eas     │    │
│  │  mongosh · stripe · railway · fly            │    │
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

## Instalación del CLI

### macOS / Linux (Recomendado)

La forma más rápida y sin fricción para auto-instalar, compilar e inyectar configuraciones en tu entorno actual:

```bash
curl -sSL https://raw.githubusercontent.com/Epigibson/Nexus/master/install.sh | bash
```

*¿Quieres desinstalarlo?* Puedes correr el desinstalador completo con:
`curl -sSL https://raw.githubusercontent.com/Epigibson/Nexus/master/uninstall.sh | bash`

### Windows (PowerShell)

Instalación rápida en un solo comando (descarga el binario oficial precompilado):

```powershell
irm https://raw.githubusercontent.com/Epigibson/Nexus/master/install.ps1 | iex
```

*Nota: Una vez instalado, reinicia tu terminal de PowerShell para que se recargue el PATH y verifica la instalación ejecutando `nexus version`.*

### Compilación Manual (Avanzado)

```bash
# 1. Descargar y compilar
git clone https://github.com/Epigibson/Nexus.git
cd Nexus/core
go build -o nexus ./cmd/nexus

# 2. Instalar globalmente
sudo mv nexus /usr/local/bin/nexus

# 3. Activar integraciones y verificar
nexus setup-shell
nexus version
# → Nexus v1.1.0
```

## Quick Start

### 1. Crear cuenta en el Dashboard

Regístrate en [nexusproject.pro](https://nexusproject.pro) y crea un proyecto con sus entornos (development, staging, production).

### 2. Generar API Key

Ve a **Configuración → API Keys → Generar Nueva Key** y copia la key (empieza con `ag_live_...`).

### 3. Conectar el CLI

```bash
# Autenticarte con tu API key (auto-sync incluido)
nexus login
# → Paste your API key: ag_live_xxxxxxxxxx...
# → ✅ Authenticated as tu-nombre (tu@email.com)
# → 📦 3 projects cached for instant switching

# Ver estado de conexión
nexus status

# Sincronizar después de cambios en el dashboard
nexus sync --all
```

### 4. ¡Hacer switch!

```bash
# Cambiar todo tu contexto de desarrollo (~5 segundos)
nexus switch mi-proyecto --env production

# → 📦 Using cached config for 'mi-proyecto'
# → ✨ cli:gh — Switched gh → 'epigibson'
# → ✨ cli:aws — Switched aws → 'prod-profile'
# → ✨ cli:supabase — Switched supabase → linked
# → ✨ ⚡ Parallel Switch — Executed 11 skills in parallel
# → ✨ Context switch complete! (5467ms)

# Forzar refresh desde la nube
nexus switch mi-proyecto --env production --refresh
```

### 5. Desconectar (opcional)

```bash
nexus logout
```

## Stack Tecnológico

| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| Core CLI & Orchestrator | Go 1.26 (Cobra CLI) | ✅ |
| Dashboard | Next.js 16 + Tailwind v4 + shadcn/ui | ✅ |
| Backend API | FastAPI + Pydantic v2 + SQLAlchemy 2.0 | ✅ |
| Payments | Stripe Checkout + Customer Portal | ✅ |
| Dashboard ↔ API | JWT Auth + REST fetch client | ✅ |
| Documentation | Mintlify (theme: palm) | ✅ |
| Database | PostgreSQL (Supabase) | ✅ |
| Encryption | AES-256-GCM + Argon2id | ✅ |

## Enlaces Oficiales

- 🌍 **Página Principal & Dashboard:** [nexusproject.pro](https://nexusproject.pro)
- 📚 **Documentación Completa:** [docs.nexusproject.pro](https://docs.nexusproject.pro)

## Licencia

MIT © Nexus Dev
