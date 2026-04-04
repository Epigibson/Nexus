package domain

import (
	"time"
)

// AuditAction represents the type of action recorded in the audit log.
type AuditAction string

const (
	AuditActionSwitch     AuditAction = "context_switch"
	AuditActionEnvInject  AuditAction = "env_inject"
	AuditActionGitSwitch  AuditAction = "git_switch"
	AuditActionCLISwitch  AuditAction = "cli_switch"
	AuditActionInit       AuditAction = "project_init"
	AuditActionError      AuditAction = "error"
)

// AuditEntry represents a single immutable record in the audit log.
// Every action performed by a Skill is recorded here for security
// and traceability purposes.
type AuditEntry struct {
	ID          string            `json:"id"`
	Timestamp   time.Time         `json:"timestamp"`
	Action      AuditAction       `json:"action"`
	ProjectName string            `json:"project_name"`
	Environment string            `json:"environment"`
	SkillName   string            `json:"skill_name,omitempty"`
	Message     string            `json:"message"`
	Details     map[string]any    `json:"details,omitempty"`
	Success     bool              `json:"success"`
	DurationMs  int64             `json:"duration_ms"`
	UserAgent   string            `json:"user_agent"`
}

// NewAuditEntry creates a new audit entry with sensible defaults.
func NewAuditEntry(action AuditAction, project, env, skill, message string) AuditEntry {
	return AuditEntry{
		ID:          generateID(),
		Timestamp:   time.Now().UTC(),
		Action:      action,
		ProjectName: project,
		Environment: env,
		SkillName:   skill,
		Message:     message,
		UserAgent:   "antigravity-cli/0.1.0",
	}
}

// generateID creates a simple sortable unique ID using timestamp + random suffix.
func generateID() string {
	return time.Now().UTC().Format("20060102T150405.000") + "-" + randomSuffix()
}

// randomSuffix generates a short random string for ID uniqueness.
func randomSuffix() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[time.Now().UnixNano()%int64(len(chars))]
		time.Sleep(1) // Ensure different nanoseconds
	}
	return string(b)
}
