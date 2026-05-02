package cli

import (
	"fmt"
	"time"

	"github.com/nexus-dev/nexus/internal/adapter/repository"
	"github.com/nexus-dev/nexus/internal/adapter/state"
	"github.com/spf13/cobra"
)

func newSyncCmd() *cobra.Command {
	var syncAll bool

	cmd := &cobra.Command{
		Use:   "sync [project-slug]",
		Short: "📦 Sync project configurations from the cloud to local cache",
		Long: `Download and cache project configurations locally for faster switches.

Cached projects are used by 'nexus switch' to avoid API fetch latency.
Cache never expires — run 'nexus sync' to update when you change
project settings in the dashboard.

Examples:
  nexus sync                    # Sync the currently active project
  nexus sync michicondrias      # Sync a specific project
  nexus sync --all              # Sync all your projects`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			client := repository.NewAPIClient(getAPIURL())
			if !client.IsAuthenticated() {
				return fmt.Errorf("not authenticated — run 'nexus login' first")
			}

			startTime := time.Now()

			if syncAll {
				return syncAllProjects(client, startTime)
			}

			// Determine which project to sync
			slug := ""
			if len(args) > 0 {
				slug = args[0]
			} else {
				// Use active project from state
				activeState, err := state.LoadActiveState()
				if err != nil || activeState == nil {
					return fmt.Errorf("no project specified and no active project. Use: nexus sync <project-slug>")
				}
				slug = activeState.ProjectName
			}

			return syncSingleProject(client, slug, startTime)
		},
	}

	cmd.Flags().BoolVarP(&syncAll, "all", "a", false, "Sync all projects")

	return cmd
}

func syncSingleProject(client *repository.APIClient, slug string, startTime time.Time) error {
	fmt.Printf("  📦 Syncing project '%s' from cloud...\n", slug)

	_, err := client.SyncProject(slug)
	if err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	elapsed := time.Since(startTime)
	fmt.Printf("  ✅ Project '%s' cached locally (%dms)\n", slug, elapsed.Milliseconds())
	fmt.Println("  💡 Future switches will use this cached config for instant startup.")
	return nil
}

func syncAllProjects(client *repository.APIClient, startTime time.Time) error {
	fmt.Println("  📦 Syncing all projects from cloud...")

	count, err := client.SyncAllProjects()
	if err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	elapsed := time.Since(startTime)
	fmt.Printf("  ✅ %d projects cached locally (%dms)\n", count, elapsed.Milliseconds())
	return nil
}

// SyncAfterLogin is called after a successful login to cache all projects.
func SyncAfterLogin(apiURL string) {
	client := repository.NewAPIClient(apiURL)
	if !client.IsAuthenticated() {
		return
	}

	fmt.Println("\n  📦 Syncing projects to local cache...")
	count, err := client.SyncAllProjects()
	if err != nil {
		fmt.Printf("  ⚠️  Auto-sync failed: %v (you can run 'nexus sync --all' later)\n", err)
		return
	}
	fmt.Printf("  ✅ %d projects cached for instant switching\n", count)
}
