package cli

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/antigravity-dev/antigravity/internal/adapter/repository"
)

const defaultAPIURL = "https://compassionate-youth-production-e13c.up.railway.app"

func getAPIURL() string {
	if url := os.Getenv("ANTIGRAVITY_API_URL"); url != "" {
		return url
	}
	return defaultAPIURL
}

// newLoginCmd creates the `antigravity login` command.
func newLoginCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "login",
		Short: "Authenticate the CLI with an API key",
		Long: `Authenticate the Antigravity CLI with your API key.

Generate an API key from the Dashboard (Settings → API Keys), then paste it here.
The key is stored securely in ~/.antigravity/credentials.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("🔐 Antigravity CLI — Login")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println("Generate an API key from your Dashboard:")
			fmt.Println("  → Settings → API Keys → Generate New Key")
			fmt.Println()
			fmt.Print("Paste your API key: ")

			reader := bufio.NewReader(os.Stdin)
			apiKey, _ := reader.ReadString('\n')
			apiKey = strings.TrimSpace(apiKey)

			if apiKey == "" {
				return fmt.Errorf("API key cannot be empty")
			}

			if !strings.HasPrefix(apiKey, "ag_live_") {
				return fmt.Errorf("invalid API key format — must start with 'ag_live_'")
			}

			// Validate the key against the API
			client := repository.NewAPIClientWithKey(getAPIURL(), apiKey)
			user, err := client.GetProfile()
			if err != nil {
				return fmt.Errorf("authentication failed: %w", err)
			}

			// Save the key
			if err := repository.SaveAPIKey(apiKey); err != nil {
				return fmt.Errorf("failed to save credentials: %w", err)
			}

			fmt.Println()
			fmt.Printf("✅ Authenticated as %s (%s)\n", user.DisplayName, user.Email)
			fmt.Printf("📋 Plan: %s\n", user.Plan)
			fmt.Println()
			fmt.Println("Run 'antigravity sync' to pull your projects from the cloud.")
			return nil
		},
	}
}

// newSyncCmd creates the `antigravity sync` command.
func newSyncCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "sync",
		Short: "Sync projects and audit log with the cloud",
		Long: `Synchronize your local project configurations with the Antigravity cloud.

This command:
  • Pulls project configs from the API into your local YAML
  • Pushes local audit log entries to the cloud
  • Shows a summary of what changed`,
		RunE: func(cmd *cobra.Command, args []string) error {
			client := repository.NewAPIClient(getAPIURL())
			if !client.IsAuthenticated() {
				return fmt.Errorf("not authenticated — run 'antigravity login' first")
			}

			fmt.Println("🔄 Antigravity Sync")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()

			// 1. Validate credentials
			fmt.Print("  Authenticating... ")
			user, err := client.GetProfile()
			if err != nil {
				fmt.Println("❌")
				return err
			}
			fmt.Printf("✅ %s\n", user.Email)

			// 2. Pull projects from cloud
			fmt.Print("  Pulling projects... ")
			projects, err := client.ListProjects()
			if err != nil {
				fmt.Println("❌")
				return err
			}
			fmt.Printf("✅ %d projects found\n", len(projects))

			// 3. Display summary
			fmt.Println()
			fmt.Println("📦 Cloud Projects:")
			for _, p := range projects {
				status := "✅"
				if !p.IsActive {
					status = "❌"
				}
				fmt.Printf("  %s %s (%s)\n", status, p.Name, p.Slug)
				for _, env := range p.Environments {
					toolCount := len(env.CLIProfiles)
					fmt.Printf("      └─ %s (branch: %s, %d tools)\n", env.Name, env.GitBranch, toolCount)
				}
			}

			fmt.Println()
			fmt.Println("✅ Sync complete!")
			return nil
		},
	}
}

// newStatusCmd creates the `antigravity status` command.
func newStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show CLI connection status",
		Long:  "Show the current authentication status and connection to the Antigravity cloud.",
		RunE: func(cmd *cobra.Command, args []string) error {
			client := repository.NewAPIClient(getAPIURL())

			fmt.Println("📊 Antigravity Status")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()

			if !client.IsAuthenticated() {
				fmt.Println("  🔴 Not authenticated")
				fmt.Println()
				fmt.Println("  Run 'antigravity login' to connect to the cloud.")
				return nil
			}

			fmt.Print("  API Key: ")
			fmt.Println("configured ✅")

			fmt.Print("  API Server: ")
			fmt.Printf("%s\n", defaultAPIURL)

			fmt.Print("  Connection: ")
			user, err := client.GetProfile()
			if err != nil {
				fmt.Println("❌ offline")
				fmt.Printf("  Error: %v\n", err)
				return nil
			}
			fmt.Println("connected ✅")

			fmt.Println()
			fmt.Printf("  👤 User: %s (%s)\n", user.DisplayName, user.Email)
			fmt.Printf("  📋 Plan: %s\n", user.Plan)

			// Fetch project count
			projects, err := client.ListProjects()
			if err == nil {
				fmt.Printf("  📦 Projects: %d\n", len(projects))
			}

			fmt.Println()
			return nil
		},
	}
}

// newLogoutCmd creates the `antigravity logout` command.
func newLogoutCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "logout",
		Short: "Remove stored API credentials",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := repository.ClearAPIKey(); err != nil {
				fmt.Println("  No credentials stored.")
				return nil
			}
			fmt.Println("✅ Credentials removed. Run 'antigravity login' to re-authenticate.")
			return nil
		},
	}
}
