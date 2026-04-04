package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const version = "0.1.0"

const banner = `
   ___         __  _                       _ __       
  / _ | ___   / /_(_)__ _______ __  _____ (_) /___ __ 
 / __ |/ _ \ / __/ / _ '/ __/ _ '/ |/ / -_) / __/ // /
/_/ |_/_//_/ \__/_/\_, /_/  \_,_/|___/\__/_/\__/\_, / 
                  /___/                         /___/  
`

var (
	cfgFile string
)

// NewRootCmd creates the root CLI command for Antigravity.
func NewRootCmd() *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "antigravity",
		Short: "⚡ Development Environment Control Center",
		Long: banner + `
  Antigravity eliminates context switching friction for developers.
  One command to switch your entire development identity:
  GitHub, AWS, Supabase, Vercel, MongoDB, and every CLI session.

  Usage:
    antigravity switch <project> [--env environment]
    antigravity init
    antigravity list
    antigravity profiles <project>`,
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "Path to antigravity.yaml config file")

	// Add subcommands
	rootCmd.AddCommand(newSwitchCmd())
	rootCmd.AddCommand(newInitCmd())
	rootCmd.AddCommand(newListCmd())
	rootCmd.AddCommand(newProfilesCmd())
	rootCmd.AddCommand(newVersionCmd())

	// Cloud commands
	rootCmd.AddCommand(newLoginCmd())
	rootCmd.AddCommand(newSyncCmd())
	rootCmd.AddCommand(newStatusCmd())
	rootCmd.AddCommand(newLogoutCmd())

	return rootCmd
}

// Execute runs the root command.
func Execute() {
	rootCmd := NewRootCmd()
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
		os.Exit(1)
	}
}
