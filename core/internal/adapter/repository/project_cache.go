package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ─── Project Cache ───
// Stores cloud project DTOs locally at ~/.nexus/cache/<slug>.json
// to eliminate API fetch latency on subsequent switches.
// Cache never expires — only refreshed via `nexus sync` or `--refresh` flag.

func getCacheDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".nexus", "cache")
}

func getCachePath(slug string) string {
	// Sanitize slug for filesystem safety
	safe := strings.ReplaceAll(slug, "/", "_")
	safe = strings.ReplaceAll(safe, "..", "_")
	return filepath.Join(getCacheDir(), safe+".json")
}

// SaveProjectCache writes a ProjectDTO to the local cache.
func SaveProjectCache(slug string, project *ProjectDTO) error {
	dir := getCacheDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	data, err := json.MarshalIndent(project, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal project for cache: %w", err)
	}

	path := getCachePath(slug)
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write cache file: %w", err)
	}

	return nil
}

// LoadProjectCache reads a ProjectDTO from the local cache.
// Returns nil, nil if the cache doesn't exist (not an error, just uncached).
func LoadProjectCache(slug string) (*ProjectDTO, error) {
	path := getCachePath(slug)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // Not cached — not an error
		}
		return nil, fmt.Errorf("failed to read cache file: %w", err)
	}

	var project ProjectDTO
	if err := json.Unmarshal(data, &project); err != nil {
		// Corrupted cache — delete it and return nil
		os.Remove(path)
		return nil, nil
	}

	return &project, nil
}

// CacheExists returns true if a cached project exists for the given slug.
func CacheExists(slug string) bool {
	_, err := os.Stat(getCachePath(slug))
	return err == nil
}

// ClearProjectCache removes the cache for a specific project.
func ClearProjectCache(slug string) error {
	path := getCachePath(slug)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ClearAllCache removes all cached projects.
func ClearAllCache() error {
	dir := getCacheDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
			os.Remove(filepath.Join(dir, entry.Name()))
		}
	}
	return nil
}

// ListCachedSlugs returns the slugs of all cached projects.
func ListCachedSlugs() []string {
	dir := getCacheDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	var slugs []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
			slug := strings.TrimSuffix(entry.Name(), ".json")
			slugs = append(slugs, slug)
		}
	}
	return slugs
}

// SyncProject fetches a project from the API and saves it to cache.
// Returns the fetched project DTO.
func (c *APIClient) SyncProject(slug string) (*ProjectDTO, error) {
	project, err := c.GetProject(slug)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch project '%s': %w", slug, err)
	}

	if err := SaveProjectCache(slug, project); err != nil {
		return project, fmt.Errorf("fetched OK but failed to cache: %w", err)
	}

	return project, nil
}

// SyncAllProjects fetches all user projects and caches them.
// Returns the count of synced projects.
func (c *APIClient) SyncAllProjects() (int, error) {
	projects, err := c.ListProjects()
	if err != nil {
		return 0, fmt.Errorf("failed to list projects: %w", err)
	}

	synced := 0
	for _, p := range projects {
		slug := p.Slug
		if slug == "" {
			slug = p.Name
		}

		// Fetch full project with cli-context (includes unmasked env vars)
		fullProject, err := c.GetProject(slug)
		if err != nil {
			fmt.Printf("  ⚠️  Failed to sync '%s': %v\n", slug, err)
			continue
		}

		if err := SaveProjectCache(slug, fullProject); err != nil {
			fmt.Printf("  ⚠️  Failed to cache '%s': %v\n", slug, err)
			continue
		}

		synced++
	}

	return synced, nil
}
