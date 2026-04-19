package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/nexus-dev/nexus/internal/domain"
	"gopkg.in/yaml.v3"
)

// YAMLReader reads project configurations from YAML files.
// Implements port.ConfigReader.
type YAMLReader struct {
	searchPaths []string
}

// NewYAMLReader creates a YAMLReader that searches the given paths for config files.
func NewYAMLReader(extraPaths ...string) *YAMLReader {
	home, _ := os.UserHomeDir()

	paths := []string{
		"nexus.yaml",
		".nexus.yaml",
		".nexus/config.yaml",
	}

	if home != "" {
		paths = append(paths,
			filepath.Join(home, ".nexus", "config.yaml"),
			filepath.Join(home, ".nexus", "projects", "*.yaml"),
		)
	}

	paths = append(paths, extraPaths...)

	return &YAMLReader{searchPaths: paths}
}

// ReadProject loads a project configuration from a YAML file.
func (r *YAMLReader) ReadProject(path string) (*domain.Project, error) {
	// If a specific path is given, use it directly
	if path != "" {
		return r.readFromFile(path)
	}

	// Otherwise, search known locations
	for _, searchPath := range r.searchPaths {
		// Skip glob patterns for direct read
		if containsGlob(searchPath) {
			continue
		}
		if _, err := os.Stat(searchPath); err == nil {
			return r.readFromFile(searchPath)
		}
	}

	return nil, fmt.Errorf("no nexus.yaml found in any known location.\n" +
		"Run 'nexus init' to create one, or specify a path with --config")
}

// ListProjects discovers all project configurations from known paths.
func (r *YAMLReader) ListProjects() ([]domain.Project, error) {
	var projects []domain.Project
	seen := make(map[string]bool)

	for _, searchPath := range r.searchPaths {
		var files []string

		if containsGlob(searchPath) {
			matches, err := filepath.Glob(searchPath)
			if err != nil {
				continue
			}
			files = matches
		} else {
			if _, err := os.Stat(searchPath); err == nil {
				files = []string{searchPath}
			}
		}

		for _, f := range files {
			abs, _ := filepath.Abs(f)
			if seen[abs] {
				continue
			}
			seen[abs] = true

			project, err := r.readFromFile(f)
			if err != nil {
				continue // Skip malformed configs
			}
			projects = append(projects, *project)
		}
	}

	return projects, nil
}

// configFile represents the full YAML file structure where
// project metadata, environments, and skills are siblings at root level.
type configFile struct {
	Version      string                             `yaml:"version"`
	Project      projectMeta                        `yaml:"project"`
	Environments map[string]domain.EnvironmentConfig `yaml:"environments"`
	Skills       []domain.Skill                     `yaml:"skills"`
}

// projectMeta holds just the project identity fields from the YAML.
type projectMeta struct {
	Name    string `yaml:"name"`
	Slug    string `yaml:"slug"`
	RepoURL string `yaml:"repo"`
}

// readFromFile parses a single YAML file into a Project.
func (r *YAMLReader) readFromFile(path string) (*domain.Project, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("cannot read config file '%s': %w", path, err)
	}

	var cfg configFile
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("invalid YAML in '%s': %w", path, err)
	}

	// Merge the flat structure into a single Project entity
	project := &domain.Project{
		Name:         cfg.Project.Name,
		Slug:         cfg.Project.Slug,
		RepoURL:      cfg.Project.RepoURL,
		Environments: cfg.Environments,
		Skills:       cfg.Skills,
	}

	absPath, _ := filepath.Abs(path)
	project.RootPath = filepath.Dir(absPath)

	return project, nil
}

// containsGlob checks if a path contains glob characters.
func containsGlob(path string) bool {
	for _, c := range path {
		if c == '*' || c == '?' || c == '[' {
			return true
		}
	}
	return false
}
