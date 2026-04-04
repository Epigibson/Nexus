package cli

import (
	"fmt"
	"os"
	"strings"

	"github.com/antigravity-dev/antigravity/internal/adapter/audit"
	"github.com/antigravity-dev/antigravity/internal/adapter/config"
	"github.com/antigravity-dev/antigravity/internal/adapter/executor"
	"github.com/antigravity-dev/antigravity/internal/port"
	"github.com/antigravity-dev/antigravity/internal/service"
	"github.com/spf13/cobra"
)

func newSwitchCmd() *cobra.Command {
	var envName string

	cmd := &cobra.Command{
		Use:   "switch <project-name>",
		Short: "🔄 Switch your entire development context to a project",
		Long: `Switch all CLI tools, environment variables, and Git state to match
the specified project and environment. This is the core command of Antigravity.

Example:
  antigravity switch my-saas-app --env production
  antigravity switch client-dashboard --env staging
  antigravity switch personal-blog`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			// Create the orchestrator with all dependencies wired up
			orch, err := buildOrchestrator()
			if err != nil {
				return err
			}

			// If no project name given, try to use current directory config
			configPath := cfgFile
			if len(args) > 0 {
				// Future: resolve project name to config path from registry
				_ = args[0]
			}

			if envName == "" {
				envName = "development" // Default environment
			}

			fmt.Print(banner)
			fmt.Printf("  🚀 Switching context → \033[1;36m%s\033[0m\n\n", envName)

			// Execute the switch
			result, err := orch.Switch(configPath, envName)
			if err != nil {
				return fmt.Errorf("switch failed: %w", err)
			}

			// Display results
			fmt.Println("  ─────────────────────────────────────────")
			for _, sr := range result.SkillResults {
				fmt.Printf("  %s\n", sr.Summary())
			}
			fmt.Println("  ─────────────────────────────────────────")

			if result.Success {
				fmt.Printf("\n  ✅ \033[1;32mContext switch complete!\033[0m (%dms)\n", result.TotalDuration.Milliseconds())
			} else {
				fmt.Printf("\n  ⚠️  \033[1;33mContext switch completed with warnings\033[0m (%dms)\n", result.TotalDuration.Milliseconds())
			}

			// Output shell script for env vars
			if result.ShellScript != "" {
				fmt.Println("\n  📋 To apply environment variables, run:")
				fmt.Println("  ─────────────────────────────────────────")
				for _, line := range strings.Split(result.ShellScript, "\n") {
					if strings.TrimSpace(line) != "" {
						fmt.Printf("  %s\n", line)
					}
				}
				fmt.Println("  ─────────────────────────────────────────")

				// Also write to a sourceable file
				home, _ := os.UserHomeDir()
				scriptPath := home + "/.antigravity/last_switch.ps1"
				os.WriteFile(scriptPath, []byte(result.ShellScript), 0600)
				fmt.Printf("\n  💡 Or source it directly:\n")
				fmt.Printf("     . %s\n", scriptPath)
			}

			return nil
		},
	}

	cmd.Flags().StringVarP(&envName, "env", "e", "development", "Target environment (development, staging, production)")

	return cmd
}

// buildOrchestrator wires up all adapters and creates the orchestrator.
func buildOrchestrator() (*service.Orchestrator, error) {
	// Config reader
	reader := config.NewYAMLReader()

	// Skill executors
	envInjector := executor.NewEnvInjector()
	gitSwitcher := executor.NewGitSwitcher()

	// CLI profilers
	allProfilers := executor.AllProfilers()
	cliProfilers := make([]port.CLIProfiler, 0, len(allProfilers))
	for _, p := range allProfilers {
		cliProfilers = append(cliProfilers, p)
	}

	// Audit logger
	auditLogger, err := audit.NewFileLogger()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize audit logger: %w", err)
	}

	// Shell emitter
	shellEmitter := executor.DetectShellEmitter()

	// Build the orchestrator
	orch := service.NewOrchestrator(service.OrchestratorConfig{
		ConfigReader:  reader,
		Executors:     []port.SkillExecutor{envInjector, gitSwitcher},
		CLIProfilers:  cliProfilers,
		AuditLogger:   auditLogger,
		ShellEmitter:  shellEmitter,
	})

	return orch, nil
}
