# Nexus Dashboard — Guía de Desarrollo

## Setup Rápido

```bash
cd dashboard/

# Instalar dependencias
npm install

# Iniciar dev server
npm run dev
# → http://localhost:3000
```

> **Requisito:** El API debe estar corriendo en `:8000` para datos reales. Sin API, la app redirige a login pero no puede autenticar.

## Stack

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Next.js | 16.2 | Framework (App Router) |
| React | 19 | UI Library |
| TypeScript | 5.x | Tipado estricto |
| Tailwind CSS | v4 | Estilos |
| shadcn/ui | latest | Componentes base (estilo base-nova) |
| Recharts | 2.x | Gráficas |
| next-themes | 0.4 | Dark/light mode |
| Lucide | latest | Iconos |

## Estructura de Rutas

```
/                              → Redirect condicional (login o dashboard)
/login                         → Página de autenticación
/dashboard                     → Overview (stats, actividad, recientes)
/dashboard/projects            → Grid de proyectos
/dashboard/projects/[slug]     → Detalle con tabs (Entornos, Skills, Actividad)
/dashboard/audit               → Tabla filtrable de audit log
/dashboard/settings            → Perfil, tema, seguridad, plan
```

## Arquitectura

### Autenticación
```
AuthProvider (lib/auth-context.tsx)
├── JWT almacenado en localStorage ("ag_token")
├── User profile en localStorage ("ag_user")
├── Restore automático al montar
├── Validación del token contra /auth/me
├── Auto-redirect a /login si token expira
└── Funciones: login(), register(), logout(), refreshProfile()
```

### Cliente HTTP
```
lib/api.ts
├── API_BASE = "http://localhost:8000/api/v1"
├── authHeaders() → agrega Bearer token automáticamente
├── handleResponse() → maneja 401 con redirect
└── 15+ métodos tipados:
    ├── Auth: login, register, getProfile, updateProfile
    ├── Projects: listProjects, getProject, createProject, deleteProject
    ├── Skills: getSkillCatalog
    ├── Audit: listAudit (con filtros)
    └── Dashboard: getStats, getActivity, getRecentSwitches
```

### Auth Guard
El dashboard layout (`/dashboard/layout.tsx`) incluye un auth guard:
```tsx
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.replace("/login");
  }
}, [isAuthenticated, isLoading, router]);
```

## Componentes Clave

### Sidebar
- Colapsable con botón de chevron
- Navegación con indicador de ruta activa
- CLI hint con comando rápido
- Avatar del usuario con plan badge
- Toggle dark/light mode
- Botón de logout

### Stats Cards (Overview)
- Proyectos Activos (con límite del plan)
- Switches Hoy (últimas 24h)
- Skills Ejecutados (últimos 7 días)
- Tools Conectados (estado actual)

### Project Detail
- Tabs: Entornos, Skills, Actividad
- CLI profiles con indicadores visuales (✅ connected, ❌ disconnected, ⚠️ expired)
- Comando copy-paste: `nexus switch {slug} --env {name}`

### Audit Table
- Filtros server-side: acción, estado
- Búsqueda client-side: mensaje, proyecto
- Paginación

## Tema y Diseño

- **Dark-mode first** (tema principal)
- **Paleta**: Violeta primario, Teal accent, Success/Warning/Destructive semánticos
- **Gradiente**: `gradient-violet` (violeta → primary)
- **Tipografía**: Inter (sans) + Geist Mono (mono)
- **Glassmorphism**: Usado en login page y cards premium
- **Micro-animaciones**: Hover effects, group transitions, loading spinners

## Build de Producción

```bash
npm run build    # Compila con Turbopack
npm start        # Sirve la build de producción
```

## Credenciales de Demo

```
Email:    dev@acme-corp.com
Password: password123
```
