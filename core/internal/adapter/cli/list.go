package cli

import (
	"fmt"

	"github.com/nexus-dev/nexus/internal/adapter/config"
	"github.com/nexus-dev/nexus/internal/adapter/executor"
	"github.com/spf13/cobra"
)

func newListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "📋 List all discovered projects",
		RunE: func(cmd *cobra.Command, args []string) error {
			reader := config.NewYAMLReader()
			projects, err := reader.ListProjects()
			if err != nil {
				return err
			}

			fmt.Print(banner)

			if len(projects) == 0 {
				fmt.Println("  No projects found.")
				fmt.Println("  Run 'nexus init' to create a configuration.")
				return nil
			}

			fmt.Println("  📂 Discovered Projects:")
			fmt.Println("  ─────────────────────────────────────────")
			for _, p := range projects {
				envNames := make([]string, 0)
				for name := range p.Environments {
					envNames = append(envNames, name)
				}
				fmt.Printf("  ▸ \033[1;36m%-20s\033[0m  envs: %v\n", p.Name, envNames)
				if p.RepoURL != "" {
					fmt.Printf("    repo: %s\n", p.RepoURL)
				}
			}
			fmt.Println("  ─────────────────────────────────────────")

			return nil
		},
	}

	return cmd
}

func newProfilesCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "profiles [project-name]",
		Short: "🔑 Show CLI tool profiles and their current state",
		Long: `Display the current authentication status of all supported CLI tools
and show which profiles are configured for each project environment.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Print(banner)
			fmt.Println("  🔑 CLI Tool Profiles:")
			fmt.Println("  ─────────────────────────────────────────")

			profilers := executor.AllProfilers()
			for _, p := range profilers {
				installed := "❌ not installed"
				current := ""
				if p.IsInstalled() {
					installed = "✅ installed"
					profile, err := p.CurrentProfile()
					if err == nil && profile != "" {
						current = fmt.Sprintf(" → \033[1;33m%s\033[0m", profile)
					}
				}

				fmt.Printf("  %-12s %s%s\n", p.ToolName(), installed, current)
			}

			fmt.Println("  ─────────────────────────────────────────")

			// If a project is specified, show its profiles
			if len(args) > 0 {
				reader := config.NewYAMLReader()
				project, err := reader.ReadProject(cfgFile)
				if err != nil {
					return err
				}

				fmt.Printf("\n  📦 Profiles for \033[1;36m%s\033[0m:\n", project.Name)
				for envName, env := range project.Environments {
					fmt.Printf("\n  \033[1m%s\033[0m (branch: %s):\n", envName, env.Branch)
					for _, cp := range env.CLIProfiles {
						fmt.Printf("    ▸ %-12s account: \033[33m%s\033[0m", cp.Tool, cp.Account)
						if cp.Org != "" {
							fmt.Printf("  org: %s", cp.Org)
						}
						if cp.Region != "" {
							fmt.Printf("  region: %s", cp.Region)
						}
						fmt.Println()
					}
				}
			}

			return nil
		},
	}

	return cmd
}

func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "📌 Print Nexus version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("Nexus v%s\n", version)
		},
	}
}
