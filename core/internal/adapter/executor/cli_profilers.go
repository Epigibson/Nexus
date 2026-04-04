package executor

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/antigravity-dev/antigravity/internal/domain"
)

// ============================================================================
// GitHub CLI Profiler (gh)
// ============================================================================

// GitHubProfiler manages GitHub CLI (gh) account switching.
// Supports switching between multiple authenticated GitHub accounts.
type GitHubProfiler struct{}

func NewGitHubProfiler() *GitHubProfiler { return &GitHubProfiler{} }

func (g *GitHubProfiler) ToolName() string { return "gh" }

func (g *GitHubProfiler) IsInstalled() bool {
	_, err := exec.LookPath("gh")
	return err == nil
}

func (g *GitHubProfiler) CurrentProfile() (string, error) {
	cmd := exec.Command("gh", "auth", "status")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "none", nil
	}
	// Parse "Logged in to github.com account <username>"
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "account") {
			parts := strings.Fields(line)
			for i, p := range parts {
				if p == "account" && i+1 < len(parts) {
					return strings.Trim(parts[i+1], " ()"), nil
				}
			}
		}
		if strings.Contains(line, "Logged in") {
			return strings.TrimSpace(line), nil
		}
	}
	return "unknown", nil
}

func (g *GitHubProfiler) Switch(profile domain.CLIProfile) error {
	// gh auth switch --user <username>
	cmd := exec.Command("gh", "auth", "switch", "--user", profile.Account)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("gh auth switch failed: %s", strings.TrimSpace(string(output)))
	}
	return nil
}

func (g *GitHubProfiler) ListProfiles() ([]string, error) {
	cmd := exec.Command("gh", "auth", "status")
	output, _ := cmd.CombinedOutput()
	// Parse all accounts from gh auth status output
	var profiles []string
	for _, line := range strings.Split(string(output), "\n") {
		if strings.Contains(line, "account") || strings.Contains(line, "Logged in") {
			profiles = append(profiles, strings.TrimSpace(line))
		}
	}
	return profiles, nil
}

// ============================================================================
// AWS CLI Profiler
// ============================================================================

// AWSProfiler manages AWS CLI profile switching.
// Works by setting the AWS_PROFILE environment variable and optionally
// running `aws sso login` for SSO-based profiles.
type AWSProfiler struct{}

func NewAWSProfiler() *AWSProfiler { return &AWSProfiler{} }

func (a *AWSProfiler) ToolName() string { return "aws" }

func (a *AWSProfiler) IsInstalled() bool {
	_, err := exec.LookPath("aws")
	return err == nil
}

func (a *AWSProfiler) CurrentProfile() (string, error) {
	cmd := exec.Command("aws", "configure", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "default", nil
	}
	for _, line := range strings.Split(string(output), "\n") {
		if strings.Contains(line, "profile") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				return parts[1], nil
			}
		}
	}
	return "default", nil
}

func (a *AWSProfiler) Switch(profile domain.CLIProfile) error {
	// AWS profile switching is done via environment variable
	// The shell emitter will handle $env:AWS_PROFILE = "profile-name"
	// For SSO profiles, we may also need to trigger a login
	cmd := exec.Command("aws", "sts", "get-caller-identity", "--profile", profile.Account)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Token might be expired, try SSO login
		loginCmd := exec.Command("aws", "sso", "login", "--profile", profile.Account)
		loginOutput, loginErr := loginCmd.CombinedOutput()
		if loginErr != nil {
			return fmt.Errorf("aws profile switch failed: %s | SSO login: %s",
				strings.TrimSpace(string(output)), strings.TrimSpace(string(loginOutput)))
		}
	}
	return nil
}

func (a *AWSProfiler) ListProfiles() ([]string, error) {
	cmd := exec.Command("aws", "configure", "list-profiles")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list AWS profiles: %s", strings.TrimSpace(string(output)))
	}
	profiles := strings.Split(strings.TrimSpace(string(output)), "\n")
	return profiles, nil
}

// ============================================================================
// Supabase CLI Profiler
// ============================================================================

// SupabaseProfiler manages Supabase CLI project linking.
type SupabaseProfiler struct{}

func NewSupabaseProfiler() *SupabaseProfiler { return &SupabaseProfiler{} }

func (s *SupabaseProfiler) ToolName() string { return "supabase" }

func (s *SupabaseProfiler) IsInstalled() bool {
	_, err := exec.LookPath("supabase")
	return err == nil
}

func (s *SupabaseProfiler) CurrentProfile() (string, error) {
	return "unknown", nil // Supabase CLI doesn't have a simple "current project" command
}

func (s *SupabaseProfiler) Switch(profile domain.CLIProfile) error {
	// Link to the specified Supabase project
	args := []string{"link", "--project-ref", profile.Account}
	if profile.Extra != nil {
		if password, ok := profile.Extra["db_password"]; ok {
			args = append(args, "--password", password)
		}
	}
	cmd := exec.Command("supabase", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("supabase link failed: %s", strings.TrimSpace(string(output)))
	}
	return nil
}

func (s *SupabaseProfiler) ListProfiles() ([]string, error) {
	cmd := exec.Command("supabase", "projects", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, err
	}
	return strings.Split(strings.TrimSpace(string(output)), "\n"), nil
}

// ============================================================================
// Vercel CLI Profiler
// ============================================================================

// VercelProfiler manages Vercel CLI scope/team switching.
type VercelProfiler struct{}

func NewVercelProfiler() *VercelProfiler { return &VercelProfiler{} }

func (v *VercelProfiler) ToolName() string { return "vercel" }

func (v *VercelProfiler) IsInstalled() bool {
	_, err := exec.LookPath("vercel")
	return err == nil
}

func (v *VercelProfiler) CurrentProfile() (string, error) {
	cmd := exec.Command("vercel", "whoami")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "none", nil
	}
	return strings.TrimSpace(string(output)), nil
}

func (v *VercelProfiler) Switch(profile domain.CLIProfile) error {
	// Vercel uses --scope for team switching
	if profile.Org != "" {
		cmd := exec.Command("vercel", "switch", profile.Org)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("vercel switch failed: %s", strings.TrimSpace(string(output)))
		}
	}
	// Link to the specific project
	if profile.Account != "" {
		cmd := exec.Command("vercel", "link", "--project", profile.Account, "--yes")
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("vercel link failed: %s", strings.TrimSpace(string(output)))
		}
	}
	return nil
}

func (v *VercelProfiler) ListProfiles() ([]string, error) {
	cmd := exec.Command("vercel", "teams", "list")
	output, _ := cmd.CombinedOutput()
	return strings.Split(strings.TrimSpace(string(output)), "\n"), nil
}

// ============================================================================
// MongoDB Profiler (mongosh / Atlas CLI)
// ============================================================================

// MongoProfiler manages MongoDB connection switching.
// Unlike other tools, MongoDB switching is primarily done via connection strings
// in environment variables rather than CLI profile commands.
type MongoProfiler struct{}

func NewMongoProfiler() *MongoProfiler { return &MongoProfiler{} }

func (m *MongoProfiler) ToolName() string { return "mongosh" }

func (m *MongoProfiler) IsInstalled() bool {
	_, err := exec.LookPath("mongosh")
	if err != nil {
		// Also check for atlas CLI
		_, err = exec.LookPath("atlas")
		return err == nil
	}
	return true
}

func (m *MongoProfiler) CurrentProfile() (string, error) {
	// Check if atlas CLI is available for profile management
	cmd := exec.Command("atlas", "config", "describe")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "none", nil
	}
	return strings.TrimSpace(string(output)), nil
}

func (m *MongoProfiler) Switch(profile domain.CLIProfile) error {
	// Try Atlas CLI profile switching first
	if _, err := exec.LookPath("atlas"); err == nil && profile.Account != "" {
		cmd := exec.Command("atlas", "config", "set", "-P", profile.Account)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("atlas config set failed: %s", strings.TrimSpace(string(output)))
		}
	}
	// MongoDB connection strings are handled via env var injection (MONGODB_URI)
	return nil
}

func (m *MongoProfiler) ListProfiles() ([]string, error) {
	if _, err := exec.LookPath("atlas"); err != nil {
		return []string{"(atlas CLI not installed - using env vars)"}, nil
	}
	cmd := exec.Command("atlas", "config", "list")
	output, _ := cmd.CombinedOutput()
	return strings.Split(strings.TrimSpace(string(output)), "\n"), nil
}

// ============================================================================
// Registry — Factory for all profilers
// ============================================================================

// AllProfilers returns instances of all supported CLI profilers.
func AllProfilers() []interface {
	ToolName() string
	IsInstalled() bool
	CurrentProfile() (string, error)
	Switch(profile domain.CLIProfile) error
	ListProfiles() ([]string, error)
} {
	return []interface {
		ToolName() string
		IsInstalled() bool
		CurrentProfile() (string, error)
		Switch(profile domain.CLIProfile) error
		ListProfiles() ([]string, error)
	}{
		NewGitHubProfiler(),
		NewAWSProfiler(),
		NewSupabaseProfiler(),
		NewVercelProfiler(),
		NewMongoProfiler(),
	}
}
