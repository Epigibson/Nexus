package executor

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/nexus-dev/nexus/internal/domain"
)

// EnvInjector handles injecting environment variables into the current session.
// Implements port.SkillExecutor for the "context-injection" skill category.
type EnvInjector struct{}

func NewEnvInjector() *EnvInjector {
	return &EnvInjector{}
}

func (e *EnvInjector) Name() string {
	return string(domain.SkillCategoryContext)
}

func (e *EnvInjector) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	if len(env.EnvVars) == 0 {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "No environment variables defined",
			Duration:  time.Since(startTime),
		}, nil
	}

	actions := make([]string, 0, len(env.EnvVars))
	for key := range env.EnvVars {
		actions = append(actions, fmt.Sprintf("Env: %s", key))
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   fmt.Sprintf("Prepared %d environment variables for injection", len(env.EnvVars)),
		Duration:  time.Since(startTime),
		Actions:   actions,
	}, nil
}

func (e *EnvInjector) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	return nil // Env vars are session-scoped, no rollback needed
}

// ----- Shell Emitters -----

// PowerShellEmitter generates PowerShell commands for env var management.
type PowerShellEmitter struct{}

func (p *PowerShellEmitter) ShellName() string { return "powershell" }

func (p *PowerShellEmitter) EmitSetEnv(key, value string) string {
	// Escape single quotes in value
	escaped := strings.ReplaceAll(value, "'", "''")
	return fmt.Sprintf("$env:%s = '%s'", key, escaped)
}

func (p *PowerShellEmitter) EmitUnsetEnv(key string) string {
	return fmt.Sprintf("Remove-Item Env:\\%s -ErrorAction SilentlyContinue", key)
}

func (p *PowerShellEmitter) EmitComment(text string) string {
	return fmt.Sprintf("# %s", text)
}

// BashEmitter generates Bash/Zsh commands for env var management.
type BashEmitter struct{}

func (b *BashEmitter) ShellName() string { return "bash" }

func (b *BashEmitter) EmitSetEnv(key, value string) string {
	// Escape special chars for bash
	escaped := strings.ReplaceAll(value, "'", "'\\''")
	return fmt.Sprintf("export %s='%s'", key, escaped)
}

func (b *BashEmitter) EmitUnsetEnv(key string) string {
	return fmt.Sprintf("unset %s", key)
}

func (b *BashEmitter) EmitComment(text string) string {
	return fmt.Sprintf("# %s", text)
}

// DetectShellEmitter returns the appropriate emitter for the current OS/shell.
func DetectShellEmitter() interface {
	ShellName() string
	EmitSetEnv(key, value string) string
	EmitUnsetEnv(key string) string
	EmitComment(text string) string
} {
	if runtime.GOOS == "windows" {
		return &PowerShellEmitter{}
	}
	return &BashEmitter{}
}

// ----- Git State Switcher -----

// GitSwitcher handles checking out the correct Git branch.
// Implements port.SkillExecutor for the "git-state" skill category.
type GitSwitcher struct{}

func NewGitSwitcher() *GitSwitcher {
	return &GitSwitcher{}
}

func (g *GitSwitcher) Name() string {
	return string(domain.SkillCategoryGit)
}

func (g *GitSwitcher) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	if env.Branch == "" {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "No branch specified for this environment",
			Duration:  time.Since(startTime),
		}, nil
	}

	repoDir := project.RootPath
	if repoDir == "" {
		repoDir, _ = os.Getwd()
	}

	// Get current branch
	currentBranch, err := getCurrentBranch(repoDir)
	if err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusFailed,
			Message:   fmt.Sprintf("Failed to get current branch: %v", err),
			Duration:  time.Since(startTime),
			Error:     err,
		}, nil
	}

	// If already on the right branch, skip
	if currentBranch == env.Branch {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSuccess,
			Message:   fmt.Sprintf("Already on branch '%s'", env.Branch),
			Duration:  time.Since(startTime),
		}, nil
	}

	// Fetch with timeout and --prune to clean stale refs
	fetchCtx, fetchCancel := context.WithTimeout(context.Background(), 30*time.Second)
	fetchCmd := exec.CommandContext(fetchCtx, "git", "fetch", "--prune")
	fetchCmd.Dir = repoDir
	_ = fetchCmd.Run()
	fetchCancel()

	// Count stash entries BEFORE stashing (locale-safe detection)
	stashCountBefore := countGitStashEntries(repoDir)

	// Stash any uncommitted work (including untracked files) to avoid conflicts
	stashCtx, stashCancel := context.WithTimeout(context.Background(), 10*time.Second)
	stashCmd := exec.CommandContext(stashCtx, "git", "stash", "--include-untracked")
	stashCmd.Dir = repoDir
	_ = stashCmd.Run()
	stashCancel()

	stashCountAfter := countGitStashEntries(repoDir)
	didStash := stashCountAfter > stashCountBefore

	// Checkout target branch with timeout
	checkoutCtx, checkoutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	cmd := exec.CommandContext(checkoutCtx, "git", "checkout", env.Branch)
	cmd.Dir = repoDir
	output, err := cmd.CombinedOutput()
	checkoutCancel()

	if err != nil {
		// If checkout failed and we stashed, restore the stash
		if didStash {
			popCmd := exec.Command("git", "stash", "pop")
			popCmd.Dir = repoDir
			_ = popCmd.Run()
		}
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusFailed,
			Message:   fmt.Sprintf("git checkout failed: %s", strings.TrimSpace(string(output))),
			Duration:  time.Since(startTime),
			Error:     err,
		}, nil
	}

	msg := fmt.Sprintf("Switched branch: '%s' → '%s'", currentBranch, env.Branch)
	actions := []string{fmt.Sprintf("git checkout %s", env.Branch)}
	if didStash {
		msg += " (uncommitted changes stashed)"
		actions = append(actions, "⚠️ run 'git stash pop' to restore your changes")
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   msg,
		Duration:  time.Since(startTime),
		Actions:   actions,
	}, nil
}

func (g *GitSwitcher) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	return nil // Git state is managed by git itself
}

// countGitStashEntries returns the number of stash entries (locale-safe).
func countGitStashEntries(repoPath string) int {
	cmd := exec.Command("git", "stash", "list")
	if repoPath != "" {
		cmd.Dir = repoPath
	}
	output, err := cmd.Output()
	if err != nil {
		return 0
	}
	trimmed := strings.TrimSpace(string(output))
	if trimmed == "" {
		return 0
	}
	return len(strings.Split(trimmed, "\n"))
}

func getCurrentBranch(repoPath string) (string, error) {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	if repoPath != "" {
		cmd.Dir = repoPath
	}
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}
