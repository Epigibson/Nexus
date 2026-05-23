# Nexus CLI — Guía de Desarrollo

## Setup Rápido

```bash
cd core/

# Compilar
go build -o nexus ./cmd/nexus/main.go

# O ejecutar directamente
go run ./cmd/main.go --help
```

## Comandos

```bash
# Autenticarse con el cloud
nexus login

# Sincronizar proyectos al cache local
nexus sync                              # Proyecto activo
nexus sync michicondrias                # Proyecto específico
nexus sync --all                        # Todos los proyectos

# Cambiar a un entorno de un proyecto (proyecto es opcional localmente)
nexus switch [project-name] --env <environment>
nexus switch my-saas --env production
nexus switch my-saas --env production --refresh  # Bypass cache local

# Ver contexto activo global y chequeo de terminal
nexus current

# Configurar integración en consola (inyector automático)
nexus setup-shell

# Descargar configuración de proyecto nube a nexus.yaml local
nexus pull michicondrias

# Ver estado de conexión
nexus status

# Listar todos los proyectos configurados localmente
nexus list

# Mostrar perfiles CLI globales o de un proyecto específico
nexus profiles [project-name]

# Inicializar una plantilla de nexus.yaml local
nexus init

# Desconectar del cloud y remover API Key
nexus logout

# Versión
nexus version
```

## Arquitectura Hexagonal

```
core/internal/
├── domain/              # Entidades puras (0 deps)
│   ├── project.go       # Project, Environment, CLIProfile, ScriptHook
│   ├── skill.go         # Skill, SkillResult, SkillCategory
│   └── audit.go         # AuditEntry
│
├── port/                # Interfaces (contratos)
│   └── ports.go         # CLIProfiler, ConfigReader, AuditLogger, ScriptGenerator
│
├── service/             # Lógica de negocio
│   └── orchestrator.go  # Orchestrator: skills + CLI profiles (paralelo) + hooks
│
└── adapter/             # Implementaciones
    ├── cli/             # Comandos Cobra
    │   ├── root.go      # Root command + banner
    │   ├── init.go      # Interactive project init
    │   ├── switch.go    # Context switch (cache-first, parallel)
    │   ├── sync.go      # Cache sync command
    │   ├── cloud.go     # Login, status, logout, pull
    │   ├── list.go      # List projects from YAML
    │   ├── current.go   # Show active context
    │   └── setup_shell.go # Shell integration
    ├── config/
    │   └── yaml_reader.go  # Lee nexus.yaml (flat structure)
    ├── executor/        # Skills + CLI Profilers
    │   ├── cli_profilers.go     # Todos los profilers (git, gh, aws, supabase, vercel, expo, etc.)
    │   ├── parallel_executor.go # Ejecución concurrente de skills
    │   ├── env_injector.go      # Variables de entorno
    │   ├── doc_generator.go     # NEXUS_CONTEXT.md
    │   └── sandbox.go           # Ephemeral sandbox
    ├── repository/
    │   ├── api_client.go    # HTTP client para el backend
    │   └── project_cache.go # Cache local de proyectos (~/.nexus/cache/)
    ├── audit/
    │   ├── file_logger.go   # Append-only JSONL local
    │   └── multi_logger.go  # Local (sync) + Remote (async)
    └── state/
        └── state_manager.go # Contexto activo global
```

## Interface CLIProfiler

Para agregar un nuevo CLI tool, implementa esta interfaz:

```go
type CLIProfiler interface {
    ToolName() string
    IsInstalled() bool
    CurrentProfile() (string, error)
    Switch(profile domain.CLIProfile) error
    ListProfiles() ([]string, error)
}
```

### Profilers disponibles

| Tool | Binario | Archivo |
|------|---------|----------|
| Git | `git` | `cli_profilers.go` |
| GitHub | `gh` | `cli_profilers.go` |
| AWS | `aws` | `cli_profilers.go` |
| Supabase | `supabase` | `cli_profilers.go` |
| Vercel | `vercel` | `cli_profilers.go` |
| Expo/EAS | `eas` / `expo` | `cli_profilers.go` |
| MongoDB | `mongosh` / `atlas` | `cli_profilers.go` |
| Stripe | `stripe` | `cli_profilers.go` |
| Railway | `railway` | `cli_profilers.go` |
| Fly.io | `fly` / `flyctl` | `cli_profilers.go` |

```go
type KubectlProfiler struct{}

func (k *KubectlProfiler) ToolName() string { return "kubectl" }

func (k *KubectlProfiler) Switch(p domain.CLIProfile) error {
    cmd := exec.Command("kubectl", "config", "use-context", p.Account)
    return cmd.Run()
}

func (k *KubectlProfiler) Verify(p domain.CLIProfile) (bool, error) {
    cmd := exec.Command("kubectl", "config", "current-context")
    out, err := cmd.Output()
    return strings.TrimSpace(string(out)) == p.Account, err
}
```

> **Tip:** Hay un workflow documentado en `.agents/workflows/add-cli-profiler.md` con instrucciones detalladas.

## Configuración (nexus.yaml)

```yaml
version: "1"

project:
  name: my-saas-app
  slug: my-saas-app
  repo: https://github.com/acme/saas

environments:
  development:
    branch: develop
    env:
      NODE_ENV: development
      DATABASE_URL: postgresql://localhost:5432/saas_dev
    cli_profiles:
      - tool: gh
        account: dev-personal
      - tool: aws
        account: acme-dev
        region: us-east-1
      - tool: supabase
        account: saas-dev-ref
        org: acme

  production:
    branch: main
    env:
      NODE_ENV: production
    cli_profiles:
      - tool: gh
        account: acme-bot
      - tool: aws
        account: acme-prod
        region: us-east-1
    hooks:
      - name: "Backup database"
        command: "pg_dump $DATABASE_URL > /tmp/backup.sql"
        phase: pre
        timeout: 120
      - name: "Run migrations"
        command: "npx prisma migrate deploy"
        phase: post
        timeout: 60

skills:
  - name: context-injection
    category: context-injection
    enabled: true
    priority: 1
  - name: git-state
    category: git-state
    enabled: true
    priority: 2
  - name: cli-switching
    category: cli-switching
    enabled: true
    priority: 3
```

## Script-Runners (Hooks)

Los hooks son comandos shell que se ejecutan automáticamente durante un context switch.

### Fases

```
PRE hooks → ENV injection → Git switch → CLI profiles → POST hooks
```

| Fase | Cuándo | Uso Típico |
|------|--------|------------|
| `pre` | Antes de cambiar contexto | Backup, guardar estado, validar |
| `post` | Después de cambiar contexto | Migrations, instalar deps, iniciar servicios |

### Configuración

```yaml
hooks:
  - name: "Display Name"     # Nombre descriptivo
    command: "shell command"  # Comando a ejecutar
    phase: pre                # pre | post
    timeout: 30               # Segundos (default: 30)
```

### Comportamiento

- **Directorio de ejecución**: `project.root_path` si está definido
- **Shell**: `sh -c` (Unix)
- **Timeout**: Default 30 segundos. Si se excede, el hook falla
- **Errores**: Un hook fallido **no detiene** los demás
- **Output**: Se captura y registra en el audit log
- **Variables de entorno**: Heredan el env del proceso actual

## Audit Log

Ubicación: `~/.nexus/audit.jsonl`

Formato (JSON Lines, append-only):
```json
{"timestamp":"2026-04-04T07:15:29Z","action":"context_switch","project":"saas-platform","env":"development","success":true,"duration_ms":1240,"message":"Context switch completado exitosamente"}
```

## Verificación

```bash
go build ./...   # Compilar sin errores
go vet ./...     # Análisis estático
go test ./...    # Tests (por implementar)
```
