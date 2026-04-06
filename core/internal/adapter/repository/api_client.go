package repository

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// APIClient handles communication with the Antigravity backend API.
type APIClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// ProjectDTO represents a project from the API.
type ProjectDTO struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Slug        string           `json:"slug"`
	Description string           `json:"description"`
	RepoURL     string           `json:"repo_url"`
	IsActive    bool             `json:"is_active"`
	Environments []EnvironmentDTO `json:"environments"`
	SwitchCount int              `json:"switch_count"`
	CreatedAt   string           `json:"created_at"`
}

// EnvironmentDTO represents an environment from the API.
type EnvironmentDTO struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Environment string          `json:"environment"`
	GitBranch   string          `json:"git_branch"`
	EnvVarCount int             `json:"env_var_count"`
	EnvVars     map[string]string `json:"env_vars"`
	CLIProfiles []CLIProfileDTO `json:"cli_profiles"`
}

// CLIProfileDTO represents a CLI profile from the API.
type CLIProfileDTO struct {
	Tool    string            `json:"tool"`
	Account string            `json:"account"`
	Region  string            `json:"region,omitempty"`
	Org     string            `json:"org,omitempty"`
	Status  string            `json:"status"`
	Extra   map[string]string `json:"extra,omitempty"`
}

// UserDTO represents the current user.
type UserDTO struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Plan        string `json:"plan"`
}

// AuditEntryDTO for pushing audit logs.
type AuditEntryDTO struct {
	Action      string `json:"action"`
	ProjectName string `json:"project_name"`
	Environment string `json:"environment"`
	Message     string `json:"message"`
	Success     bool   `json:"success"`
	DurationMs  int64  `json:"duration_ms"`
}

// NewAPIClient creates a client configured with API key from credentials file.
func NewAPIClient(baseURL string) *APIClient {
	apiKey := loadAPIKey()
	return &APIClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewAPIClientWithKey creates a client with an explicit API key.
func NewAPIClientWithKey(baseURL, apiKey string) *APIClient {
	return &APIClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsAuthenticated returns true if an API key is configured.
func (c *APIClient) IsAuthenticated() bool {
	return c.apiKey != ""
}

// GetProfile fetches the current user profile.
func (c *APIClient) GetProfile() (*UserDTO, error) {
	var user UserDTO
	if err := c.get("/auth/me", &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// ListProjects fetches all projects from the API.
func (c *APIClient) ListProjects() ([]ProjectDTO, error) {
	var projects []ProjectDTO
	if err := c.get("/projects/", &projects); err != nil {
		return nil, err
	}
	return projects, nil
}

// GetProject fetches a single project by slug with unmasked env vars for CLI use.
func (c *APIClient) GetProject(slug string) (*ProjectDTO, error) {
	var project ProjectDTO
	if err := c.get(fmt.Sprintf("/projects/%s/cli-context", slug), &project); err != nil {
		return nil, err
	}
	return &project, nil
}

// ─── HTTP helpers ───

func (c *APIClient) get(path string, result interface{}) error {
	req, err := http.NewRequest("GET", c.baseURL+"/api/v1"+path, nil)
	if err != nil {
		return err
	}
	return c.doRequest(req, result)
}

func (c *APIClient) post(path string, body interface{}, result interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", c.baseURL+"/api/v1"+path, bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return c.doRequest(req, result)
}

func (c *APIClient) doRequest(req *http.Request, result interface{}) error {
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == 401 {
		return fmt.Errorf("authentication failed — run 'antigravity login' to set your API key")
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	if result != nil {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
	}

	return nil
}

// PushAudit sends an audit log entry to the API.
func (c *APIClient) PushAudit(entry AuditEntryDTO) error {
	return c.post("/audit/", entry, nil)
}

// ─── Credentials file management ───

const credentialsFile = "credentials"

// SaveAPIKey persists the API key to ~/.antigravity/credentials.
func SaveAPIKey(apiKey string) error {
	dir := getConfigDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	path := filepath.Join(dir, credentialsFile)
	return os.WriteFile(path, []byte(apiKey), 0600)
}

// loadAPIKey reads the API key from ~/.antigravity/credentials.
func loadAPIKey() string {
	path := filepath.Join(getConfigDir(), credentialsFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(bytes.TrimSpace(data))
}

// ClearAPIKey removes the stored credentials.
func ClearAPIKey() error {
	path := filepath.Join(getConfigDir(), credentialsFile)
	return os.Remove(path)
}

func getConfigDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".antigravity")
}
