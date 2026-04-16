package port

import (
	"github.com/nexus-dev/nexus/internal/domain"
)

// ConfigReader defines the port for reading project configurations.
// Adapters: YAML file reader, JSON reader, remote API reader.
type ConfigReader interface {
	// ReadProject loads the project configuration from the given path.
	// If path is empty, it searches typical locations (./nexus.yaml, ~/.nexus/).
	ReadProject(path string) (*domain.Project, error)

	// ListProjects returns all discovered projects from known config locations.
	ListProjects() ([]domain.Project, error)
}

// SkillExecutor defines the port for executing a specific skill.
// Each skill type (env injection, git switching, CLI switching) has its own executor.
type SkillExecutor interface {
	// Name returns the unique name of this executor (matches skill category).
	Name() string

	// Execute runs the skill against the given project environment.
	Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error)

	// Rollback attempts to undo the changes made by this skill (best-effort).
	Rollback(project *domain.Project, env *domain.EnvironmentConfig) error
}

// CLIProfiler defines the port for switching CLI tool authentication profiles.
// This is the CORE differentiator of Nexus: each adapter knows how to
// log in/switch accounts for a specific CLI tool (gh, aws, supabase, etc.).
type CLIProfiler interface {
	// ToolName returns the CLI tool name (e.g., "gh", "aws", "supabase").
	ToolName() string

	// IsInstalled checks if the CLI tool is available on the system.
	IsInstalled() bool

	// CurrentProfile returns the currently active profile/account.
	CurrentProfile() (string, error)

	// Switch activates the specified profile/account for this tool.
	Switch(profile domain.CLIProfile) error

	// ListProfiles returns all available profiles for this tool.
	ListProfiles() ([]string, error)
}

// AuditLogger defines the port for recording immutable audit entries.
type AuditLogger interface {
	// Log records an audit entry. This operation must be append-only.
	Log(entry domain.AuditEntry) error

	// GetLogs retrieves audit entries for a project, newest first.
	GetLogs(projectName string, limit int) ([]domain.AuditEntry, error)
}

// CryptoService defines the port for encrypting/decrypting secrets.
type CryptoService interface {
	// Encrypt encrypts plaintext using the local master key.
	Encrypt(plaintext []byte) ([]byte, error)

	// Decrypt decrypts ciphertext using the local master key.
	Decrypt(ciphertext []byte) ([]byte, error)

	// IsInitialized checks if the encryption key has been set up.
	IsInitialized() bool

	// Initialize sets up the encryption key from a master password.
	Initialize(masterPassword string) error
}

// ShellEmitter defines the port for generating shell-specific commands.
type ShellEmitter interface {
	// ShellName returns the target shell (e.g., "powershell", "bash", "zsh").
	ShellName() string

	// EmitSetEnv returns a shell command to set an environment variable.
	EmitSetEnv(key, value string) string

	// EmitUnsetEnv returns a shell command to unset an environment variable.
	EmitUnsetEnv(key string) string

	// EmitComment returns a shell comment line.
	EmitComment(text string) string
}
