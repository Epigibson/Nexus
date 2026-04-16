package executor

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"time"

	"github.com/nexus-dev/nexus/internal/domain"
)

// ScriptRunner handles executing arbitrary shell commands defined in the environment profile.
// Implements port.SkillExecutor for the "scripts" skill category.
type ScriptRunner struct{}

func NewScriptRunner() *ScriptRunner {
	return &ScriptRunner{}
}

func (s *ScriptRunner) Name() string {
	return string(domain.SkillCategoryScripts)
}

func (s *ScriptRunner) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	commandsRaw, ok := skill.Config["commands"]
	if !ok {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "No commands defined in skill config",
			Duration:  time.Since(startTime),
		}, nil
	}

	commandsList, ok := commandsRaw.([]interface{})
	if !ok {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusFailed,
			Message:   "Invalid format for commands, expected a list of strings",
			Duration:  time.Since(startTime),
		}, nil
	}

	actions := make([]string, 0)
	for i, cmdRaw := range commandsList {
		cmdStr, ok := cmdRaw.(string)
		if !ok {
			continue
		}

		actions = append(actions, fmt.Sprintf("Run: %s", cmdStr))
		fmt.Printf("  ▶️ Running script [%d/%d]: %s\n", i+1, len(commandsList), cmdStr)

		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("powershell", "-NoProfile", "-Command", cmdStr)
		} else {
			cmd = exec.Command("bash", "-c", cmdStr)
		}

		cmd.Dir = project.RootPath
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		// Execute synchronously to allow interactive tools to finish (like npm install)
		err := cmd.Run()
		if err != nil {
			return &domain.SkillResult{
				SkillName: skill.Name,
				Status:    domain.SkillStatusFailed,
				Message:   fmt.Sprintf("Script failed: %s", cmdStr),
				Duration:  time.Since(startTime),
				Error:     err,
			}, nil
		}
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   fmt.Sprintf("Executed %d scripts successfully", len(actions)),
		Duration:  time.Since(startTime),
		Actions:   actions,
	}, nil
}

func (s *ScriptRunner) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	// Script rollback would require a reverse bash script, which is too unpredictable.
	// Returning nil means no generic rollback is attempted for this skill.
	return nil
}
