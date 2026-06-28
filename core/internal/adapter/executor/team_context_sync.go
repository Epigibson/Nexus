package executor

import (
	"fmt"
	"os/user"
	"time"

	"github.com/nexus-dev/nexus/internal/adapter/repository"
	"github.com/nexus-dev/nexus/internal/domain"
)

// TeamContextSync broadcasts a context switch notification to team members
// via the Nexus Cloud API. The API handles real-time delivery (websocket/SSE).
type TeamContextSync struct {
	apiClient *repository.APIClient
}

func NewTeamContextSync() *TeamContextSync {
	return &TeamContextSync{}
}

// SetAPIClient injects the API client dependency.
func (t *TeamContextSync) SetAPIClient(client *repository.APIClient) {
	t.apiClient = client
}

func (t *TeamContextSync) Name() string {
	return string(domain.SkillCategoryTeamSync)
}

func (t *TeamContextSync) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	broadcast := true
	if val, ok := skill.Config["broadcast_on_switch"].(bool); ok {
		broadcast = val
	}

	if !broadcast {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Team broadcast disabled in project configuration",
			Duration:  time.Since(startTime),
		}, nil
	}

	if t.apiClient == nil || !t.apiClient.IsAuthenticated() {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Not authenticated — run 'nexus login' to enable team sync",
			Duration:  time.Since(startTime),
		}, nil
	}

	// Get current username for the broadcast
	username := "unknown"
	if u, err := user.Current(); err == nil {
		username = u.Username
	}

	// Broadcast via API
	payload := map[string]interface{}{
		"project":     project.Name,
		"slug":        project.Slug,
		"environment": env.Name,
		"user":        username,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"event":       "context_switch",
	}

	var result map[string]interface{}
	if err := t.apiClient.PostJSON("/team/broadcast", payload, &result); err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusFailed,
			Message:   fmt.Sprintf("Failed to broadcast to team: %v", err),
			Duration:  time.Since(startTime),
		}, nil
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   fmt.Sprintf("Context switch broadcasted to team (%s → %s)", project.Name, env.Name),
		Duration:  time.Since(startTime),
		Actions:   []string{fmt.Sprintf("Notified organization: %s switched to %s/%s", username, project.Name, env.Name)},
	}, nil
}

func (t *TeamContextSync) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	return nil // fire-and-forget, cannot un-broadcast
}
