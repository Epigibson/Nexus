# Antigravity CLI — Guía de Desarrollo

## Setup Rápido

```bash
cd core/

# Compilar
go build -o antigravity ./cmd/main.go

# O ejecutar directamente
go run ./cmd/main.go --help
```

## Comandos

```bash
# Inicializar un nuevo proyecto (genera antigravity.yaml interactivo)
antigravity init

# Cambiar a un entorno de un proyecto
antigravity switch <project-name> --env <environment>
antigravity switch my-saas --env development

# Listar todos los proyectos configurados
antigravity list

# Mostrar perfiles CLI de un proyecto
antigravity profiles <project-name>

# Versión
antigravity version
```

## Arquitectura Hexagonal

```
core/internal/
├── domain/              # Entidades puras (0 deps)
│   ├── project.go       # Project, Environment, CLIProfile
│   ├── skill.go         # Skill, SkillResult
│   └── audit.go         # AuditEntry
│
├── port/                # Interfaces (contratos)
│   └── ports.go         # CLIProfiler, ConfigReader, AuditLogger, ScriptGenerator
│
├── service/             # Lógica de negocio
│   └── orchestrator.go  # Orchestrator: coordina skills en secuencia
│
└── adapter/             # Implementaciones
    ├── cli/             # Comandos Cobra
    │   ├── root.go      # Root command + banner
    │   ├── init.go      # Interactive project init
    │   ├── switch.go    # Context switch (main flow)
    │   ├── list.go      # List projects from YAML
    │   └── profiles.go  # Show CLI profiles
    ├── config/
    │   └── yaml_reader.go  # Lee antigravity.yaml (flat structure)
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

## Configuración (antigravity.yaml)

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

## Audit Log

Ubicación: `~/.antigravity/audit.jsonl`

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
