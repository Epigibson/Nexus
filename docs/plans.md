# Planes y Suscripciones

Nexus ofrece tres niveles de plan para adaptarse a diferentes necesidades.

## Comparación de Planes

| Feature | Free | Premium ($12/mes) | Enterprise |
|---------|------|-------------------|------------|
| Proyectos | 3 | 100 | Ilimitado |
| CLI Tools por proyecto | 5 | Ilimitado | Ilimitado |
| Miembros del equipo | 1 | 50 | Ilimitado |
| Skills manuales | ✅ | ✅ | ✅ |
| Skills premium (auto) | ❌ | ✅ | ✅ |
| Script-Runners (hooks) | ❌ | ✅ | ✅ |
| Gestión de equipos | ❌ | ✅ | ✅ |
| Audit log local | ✅ | ✅ | ✅ |
| Audit log en la nube | ❌ | ✅ | ✅ |
| Soporte | Comunitario | Prioritario | Dedicado 24/7 |
| SSO / SAML | ❌ | ❌ | ✅ |
| SLA garantizado | ❌ | ❌ | ✅ |
| On-premise | ❌ | ❌ | ✅ |

## Enforcement de Límites

La lógica de enforcement está centralizada en `api/app/services/plan_enforcement.py`.

### Funciones de Validación

```python
# Verifica límite de proyectos al crear
await check_project_limit(db, org_id)

# Verifica límite de CLI tools al configurar
await check_cli_tools_limit(db, org_id, project_id, new_count)

# Verifica límite de miembros al invitar
await check_member_limit(db, org_id)

# Verifica acceso a skills premium
await check_premium_skill(db, org_id, is_premium_skill=True)
```

### Dónde se Aplican

| Límite | Endpoint | Cuándo |
|--------|----------|--------|
| Proyectos | `POST /projects/` | Al crear un proyecto nuevo |
| CLI Tools | `POST /projects/{slug}/environments` | Al agregar un entorno con CLI profiles |
| CLI Tools | `PUT /projects/{slug}/environments/{name}` | Al actualizar CLI profiles |
| Miembros | `POST /teams/members` | Al invitar un miembro |
| Skills Premium | `PUT /skills/projects/{slug}/{skill_id}` | Al activar un skill premium |

### Plan Enterprise

El plan Enterprise tiene límites ilimitados (`999999`). Se configura manualmente para cuentas corporativas.

```python
# En plan_enforcement.py
PLAN_LIMITS = {
    "free": {"max_projects": 3, "max_cli_tools": 5, "max_members": 1, ...},
    "premium": {"max_projects": 100, "max_cli_tools": 999999, "max_members": 50, ...},
    "enterprise": {"max_projects": 999999, "max_cli_tools": 999999, "max_members": 999999, ...},
}
```

## Flujo de Upgrade (Stripe)

```
Usuario Free → Click "Hacer Upgrade" → Stripe Checkout → Confirmar → Plan Premium activo
```

### Pasos Técnicos

1. **Frontend**: Click en "Hacer Upgrade" llama `api.createCheckout()`
2. **Backend**: `POST /billing/create-checkout` crea sesión de Stripe Checkout
3. **Stripe**: Redirige al usuario al formulario de pago
4. **Callback**: Stripe redirige a `/dashboard/billing?session_id=...`
5. **Backend**: `POST /billing/confirm-subscription` verifica pago y actualiza plan
6. **DB**: `organization.plan = "premium"`, `user.plan = "premium"`

### Variables de Entorno Requeridas

```env
STRIPE_SECRET_KEY=sk_live_...       # API key de Stripe (server-side)
STRIPE_PUBLISHABLE_KEY=pk_live_...  # API key de Stripe (client-side)
STRIPE_WEBHOOK_SECRET=whsec_...     # Para validar webhooks (opcional)
```

## Script-Runners (Hooks)

Los hooks son comandos shell que se ejecutan automáticamente durante un context switch.

### Configuración en `nexus.yaml`

```yaml
environments:
  development:
    branch: develop
    env:
      NODE_ENV: development
    hooks:
      - name: "Instalar dependencias"
        command: "npm install"
        phase: pre          # Se ejecuta ANTES del switch
        timeout: 120        # Segundos (default: 30)
      - name: "Iniciar dev server"
        command: "npm run dev &"
        phase: post         # Se ejecuta DESPUÉS del switch
        timeout: 10
      - name: "Run migrations"
        command: "npx prisma migrate deploy"
        phase: post
        timeout: 60
```

### Fases de Ejecución

```
PRE hooks → Skills (env vars, git, CLI profiles) → CLI profile switching → POST hooks
```

| Fase | Uso común |
|------|-----------|
| `pre` | Guardar estado actual, backup, validaciones |
| `post` | Migraciones, instalar deps, iniciar servicios |

### Comportamiento

- **Timeout**: Default 30s. Si un hook excede el timeout, se marca como `failed`
- **Directorio**: Los scripts se ejecutan desde `project.root_path` si está definido
- **Shell**: Ejecutados via `sh -c` en Linux/macOS
- **Output**: La salida del script se captura y registra en el audit log
- **Errores**: Un hook fallido no detiene la ejecución de los siguientes hooks ni de los skills

### API Schema

```json
{
  "hooks": [
    {
      "name": "Run migrations",
      "command": "npm run migrate",
      "phase": "post",
      "timeout": 30
    }
  ]
}
```

Los hooks se configuran por entorno via:
- `POST /projects/{slug}/environments` (crear entorno con hooks)
- `PUT /projects/{slug}/environments/{name}` (actualizar hooks de un entorno)

## Seed de Skills

Al arrancar la API, se siembran automáticamente 12 skills:

### Skills Incluidos (Free)
1. **Branch Switcher** — Cambia a la rama Git del entorno
2. **CLI Profiler** — Configura CLIs según el perfil activo
3. **Context Snapshot** — Guarda snapshot del estado antes de cambiar
4. **Env Injector** — Inyecta variables de entorno
5. **Git Context** — Detecta rama, último commit y working tree

### Skills Premium
1. **Auto Documentation** — Genera docs automáticas del proyecto
2. **Cloud Audit Sync** — Sincroniza audit log con la nube
3. **Parallel Switch** — Cambia múltiples servicios en paralelo
4. **Sandbox Environments** — Crea entornos efímeros aislados
5. **Script Runner** — Ejecuta scripts pre/post switch
6. **Dependency Checker** — Verifica dependencias del proyecto
7. **Secret Rotator** — Audita y rota secrets expirados

La lógica de seed está en `api/app/services/seed_skills.py`.
