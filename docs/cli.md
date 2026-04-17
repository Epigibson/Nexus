# Nexus CLI — Guía de Desarrollo

## Setup Rápido

```bash
cd core/

# Compilar
go build -o nexus ./cmd/main.go

# O ejecutar directamente
go run ./cmd/main.go --help
```

## Comandos

```bash
# Inicializar un nuevo proyecto (genera nexus.yaml interactivo)
nexus init

# Cambiar a un entorno de un proyecto
nexus switch <project-name> --env <environment>
nexus switch my-saas --env development

# Listar todos los proyectos configurados
nexus list

# Mostrar perfiles CLI de un proyecto
nexus profiles <project-name>

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
│   └── orchestrator.go  # Orchestrator: skills + hooks pre/post
│
└── adapter/             # Implementaciones
    ├── cli/             # Comandos Cobra
    │   ├── root.go      # Root command + banner
    │   ├── init.go      # Interactive project init
    │   ├── switch.go    # Context switch (main flow)
    │   ├── list.go      # List projects from YAML
    │   └── profiles.go  # Show CLI profiles
    ├── config/
    │   └── yaml_reader.go  # Lee nexus.yaml (flat structure)
    ├── executor/        # CLI Profilers
    │   ├── github.go    # gh auth switch
    │   ├── aws.go       # aws sso login
    │   ├── supabase.go  # supabase link
    │   ├── vercel.go    # vercel switch
    │   └── mongo.go     # atlas config set
    ├── audit/
    │   └── jsonl_logger.go  # Append-only JSONL file
    └── script/
        └── env_generator.go # PowerShell/Bash env injection
```

## Interface CLIProfiler

Para agregar un nuevo CLI tool, implementa esta interfaz:

```go
type CLIProfiler interface {
    ToolName() string
    Switch(profile domain.CLIProfile) error
    Verify(profile domain.CLIProfile) (bool, error)
}
```

### Ejemplo: Agregar kubectl

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
name: my-saas-app
description: SaaS Platform principal
repo_url: https://github.com/acme/saas

environments:
  - name: development
    branch: develop
    env_vars:
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

  - name: production
    branch: main
    env_vars:
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
    enabled: true
    priority: 1
  - name: git-state
    enabled: true
    priority: 2
  - name: cli-switching
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
