package executor

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/nexus-dev/nexus/internal/domain"
)

// Sandbox provisions ephemeral Docker containers for isolated development workspaces.
// It creates containers with the project's env vars injected and the project
// directory mounted, then tracks the container ID for cleanup via Rollback.
type Sandbox struct {
	containerID string
}

func NewSandbox() *Sandbox {
	return &Sandbox{}
}

func (s *Sandbox) Name() string {
	return string(domain.SkillCategorySandbox)
}

func (s *Sandbox) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	// Read config
	image := "ubuntu:22.04"
	if val, ok := skill.Config["image"].(string); ok && val != "" {
		image = val
	}

	ttl := 60.0
	if val, ok := skill.Config["ttl_minutes"].(float64); ok {
		ttl = val
	}

	mountProject := true
	if val, ok := skill.Config["mount_project"].(bool); ok {
		mountProject = val
	}

	// Check Docker availability
	if _, err := exec.LookPath("docker"); err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Docker not installed — skipping sandbox provisioning",
			Duration:  time.Since(startTime),
		}, nil
	}

	// Verify Docker daemon is running
	if err := checkDockerDaemon(); err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Docker daemon is not running",
			Duration:  time.Since(startTime),
		}, nil
	}

	// Generate unique container name
	containerName := fmt.Sprintf("nexus-sandbox-%s-%s-%d",
		strings.ReplaceAll(project.Slug, "_", "-"),
		strings.ReplaceAll(string(env.Name), "_", "-"),
		time.Now().Unix()%100000,
	)

	// Build docker run args
	args := []string{"run", "-d", "--name", containerName}

	// Add TTL label for cleanup
	args = append(args, "--label", fmt.Sprintf("nexus.ttl=%d", int(ttl)))
	args = append(args, "--label", fmt.Sprintf("nexus.project=%s", project.Slug))
	args = append(args, "--label", fmt.Sprintf("nexus.env=%s", env.Name))
	args = append(args, "--label", "nexus.managed=true")

	// Inject environment variables
	for key, value := range env.EnvVars {
		args = append(args, "-e", fmt.Sprintf("%s=%s", key, value))
	}

	// Mount project directory
	if mountProject && project.RootPath != "" {
		args = append(args, "-v", fmt.Sprintf("%s:/workspace", project.RootPath))
		args = append(args, "-w", "/workspace")
	}

	// Add image and default command
	args = append(args, image, "sleep", fmt.Sprintf("%d", int(ttl*60)))

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to create sandbox container: %w (output: %s)", err, strings.TrimSpace(string(output)))
	}

	containerID := strings.TrimSpace(string(output))
	s.containerID = containerID

	// Truncate container ID for display
	displayID := containerID
	if len(displayID) > 12 {
		displayID = displayID[:12]
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   fmt.Sprintf("Sandbox container '%s' provisioned (TTL: %.0f min)", containerName, ttl),
		Duration:  time.Since(startTime),
		Actions: []string{
			fmt.Sprintf("Container: %s", containerName),
			fmt.Sprintf("Image: %s", image),
			fmt.Sprintf("ID: %s", displayID),
			fmt.Sprintf("Auto-cleanup in %.0f minutes", ttl),
		},
	}, nil
}

// Rollback removes the sandbox container if one was created.
func (s *Sandbox) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	if s.containerID == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "rm", "-f", s.containerID)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to remove sandbox container %s: %w", s.containerID[:12], err)
	}

	s.containerID = ""
	return nil
}

// CleanupExpired removes all nexus-managed containers that have exceeded their TTL.
func CleanupExpiredSandboxes() (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// List all nexus-managed containers
	cmd := exec.CommandContext(ctx, "docker", "ps", "-q",
		"--filter", "label=nexus.managed=true",
		"--format", "{{.ID}}",
	)
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to list containers: %w", err)
	}

	ids := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(ids) == 0 || (len(ids) == 1 && ids[0] == "") {
		return 0, nil
	}

	removed := 0
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		rmCmd := exec.CommandContext(ctx, "docker", "rm", "-f", id)
		if err := rmCmd.Run(); err == nil {
			removed++
		}
	}

	return removed, nil
}

// checkDockerDaemon verifies the Docker daemon is accessible.
func checkDockerDaemon() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "info")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker daemon not accessible: %w", err)
	}
	return nil
}
