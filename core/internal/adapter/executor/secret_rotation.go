package executor

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/nexus-dev/nexus/internal/domain"
)

// SecretRotation verifies the freshness of secrets stored in AWS SSM
// Parameter Store. It reports which secrets are current and which
// may need rotation based on the configured interval.
type SecretRotation struct{}

func NewSecretRotation() *SecretRotation {
	return &SecretRotation{}
}

func (s *SecretRotation) Name() string {
	return string(domain.SkillCategorySecretRotation)
}

func (s *SecretRotation) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	provider := "aws_ssm"
	if val, ok := skill.Config["vault_provider"].(string); ok && val != "" {
		provider = val
	}

	interval := 90.0
	if val, ok := skill.Config["rotation_interval_days"].(float64); ok {
		interval = val
	}

	// Get secret paths from config
	var secretPaths []string
	if paths, ok := skill.Config["secret_paths"].([]interface{}); ok {
		for _, p := range paths {
			if path, ok := p.(string); ok && path != "" {
				secretPaths = append(secretPaths, path)
			}
		}
	}

	// If no specific paths, discover from environment variables
	if len(secretPaths) == 0 {
		for key := range env.EnvVars {
			if isSecretVar(key) {
				secretPaths = append(secretPaths, fmt.Sprintf("/nexus/%s/%s/%s", project.Slug, env.Name, strings.ToLower(key)))
			}
		}
	}

	if len(secretPaths) == 0 {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "No secret paths configured or discovered",
			Duration:  time.Since(startTime),
		}, nil
	}

	if provider != "aws_ssm" {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   fmt.Sprintf("Provider '%s' not yet supported (only aws_ssm)", provider),
			Duration:  time.Since(startTime),
		}, nil
	}

	// Check AWS CLI availability
	if _, err := exec.LookPath("aws"); err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "AWS CLI not installed — skipping secret verification",
			Duration:  time.Since(startTime),
		}, nil
	}

	// Verify each secret
	verified := 0
	needsRotation := 0
	var actions []string

	for _, path := range secretPaths {
		status, daysOld, err := verifySSMSecret(path)
		if err != nil {
			actions = append(actions, fmt.Sprintf("%s: not found or inaccessible", path))
			continue
		}

		verified++
		if daysOld > interval {
			needsRotation++
			actions = append(actions, fmt.Sprintf("%s: %.0f days old (NEEDS ROTATION)", path, daysOld))
		} else {
			actions = append(actions, fmt.Sprintf("%s: %.0f days old (OK)", path, daysOld))
		}
		_ = status
	}

	message := fmt.Sprintf("Verified %d/%d secrets via AWS SSM", verified, len(secretPaths))
	if needsRotation > 0 {
		message += fmt.Sprintf(" (%d need rotation)", needsRotation)
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   message,
		Duration:  time.Since(startTime),
		Actions:   actions,
	}, nil
}

func (s *SecretRotation) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	return nil // read-only, no changes to undo
}

// verifySSMSecret checks a single SSM parameter's last modified date.
func verifySSMSecret(path string) (string, float64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "aws", "ssm", "get-parameter",
		"--name", path,
		"--query", "Parameter.LastModifiedDate",
		"--output", "text",
	)
	output, err := cmd.Output()
	if err != nil {
		return "", 0, fmt.Errorf("SSM get-parameter failed: %w", err)
	}

	dateStr := strings.TrimSpace(string(output))
	if dateStr == "" || dateStr == "None" {
		return "unknown", 0, nil
	}

	// Parse the date (AWS returns ISO 8601)
	lastModified, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		// Try alternate format
		lastModified, err = time.Parse("2006-01-02T15:04:05.000Z", dateStr)
		if err != nil {
			return "unknown", 0, nil
		}
	}

	daysOld := time.Since(lastModified).Hours() / 24
	return "active", daysOld, nil
}

// isSecretVar returns true if the env var name looks like a secret.
func isSecretVar(key string) bool {
	upper := strings.ToUpper(key)
	secretPatterns := []string{
		"SECRET", "TOKEN", "KEY", "PASSWORD", "PASS", "CREDENTIAL",
		"AUTH", "API_KEY", "ACCESS_KEY", "PRIVATE",
	}
	for _, pattern := range secretPatterns {
		if strings.Contains(upper, pattern) {
			return true
		}
	}
	return false
}
