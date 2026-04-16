package config

import (
	"fmt"
	"os"

	"github.com/nexus-dev/nexus/internal/adapter/repository"
	"github.com/nexus-dev/nexus/internal/domain"
	"gopkg.in/yaml.v3"
)

// WriteProjectFromDTO translates an API ProjectDTO to the config structure and writes to a file
func WriteProjectFromDTO(path string, dto *repository.ProjectDTO) error {
	cfg := configFile{
		Version: "1",
		Project: projectMeta{
			Name:    dto.Name,
			Slug:    dto.Slug,
			RepoURL: dto.RepoURL,
		},
		Environments: make(map[string]domain.EnvironmentConfig),
	}

	for _, envDTO := range dto.Environments {
		profiles := make([]domain.CLIProfile, 0, len(envDTO.CLIProfiles))
		for _, profDTO := range envDTO.CLIProfiles {
			profiles = append(profiles, domain.CLIProfile{
				Tool:    profDTO.Tool,
				Account: profDTO.Account,
				Region:  profDTO.Region,
				Org:     profDTO.Org,
				Extra:   profDTO.Extra,
			})
		}

		cfg.Environments[envDTO.Name] = domain.EnvironmentConfig{
			Name:        domain.Environment(envDTO.Name),
			Branch:      envDTO.GitBranch,
			EnvVars:     envDTO.EnvVars,
			CLIProfiles: profiles,
		}
	}

	data, err := yaml.Marshal(&cfg)
	if err != nil {
		return fmt.Errorf("failed to marshal to yaml: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}

	return nil
}
