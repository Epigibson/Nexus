package executor

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nexus-dev/nexus/internal/adapter/repository"
	"github.com/nexus-dev/nexus/internal/domain"
)

// CloudAuditSync flushes local audit logs to the Nexus Cloud API.
// It reads the local audit.jsonl file, tracks a sync cursor to avoid
// re-sending entries, and pushes new entries in batches.
type CloudAuditSync struct {
	apiClient *repository.APIClient
}

func NewCloudAuditSync() *CloudAuditSync {
	return &CloudAuditSync{}
}

// SetAPIClient injects the API client dependency.
func (c *CloudAuditSync) SetAPIClient(client *repository.APIClient) {
	c.apiClient = client
}

func (c *CloudAuditSync) Name() string {
	return string(domain.SkillCategoryCloudAudit)
}

func (c *CloudAuditSync) Execute(project *domain.Project, env *domain.EnvironmentConfig, skill *domain.Skill) (*domain.SkillResult, error) {
	startTime := time.Now()

	syncOnSwitch, ok := skill.Config["sync_on_switch"].(bool)
	if ok && !syncOnSwitch {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Cloud Audit Sync is disabled in project configuration",
			Duration:  time.Since(startTime),
		}, nil
	}

	if c.apiClient == nil || !c.apiClient.IsAuthenticated() {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSkipped,
			Message:   "Not authenticated — run 'nexus login' to enable cloud audit sync",
			Duration:  time.Since(startTime),
		}, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("cannot determine home directory: %w", err)
	}

	auditPath := filepath.Join(home, ".nexus", "audit.jsonl")
	cursorPath := filepath.Join(home, ".nexus", ".audit_sync_cursor")

	// Read new entries since last sync
	entries, lastByteOffset, err := readNewAuditEntries(auditPath, cursorPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read audit entries: %w", err)
	}

	if len(entries) == 0 {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSuccess,
			Message:   "No new audit entries to sync",
			Duration:  time.Since(startTime),
			Actions:   []string{"Local audit log is up to date"},
		}, nil
	}

	// Push entries to API
	syncedCount := 0
	for _, entry := range entries {
		dto := repository.AuditEntryDTO{
			Action:      string(entry.Action),
			ProjectName: entry.ProjectName,
			Environment: entry.Environment,
			Message:     entry.Message,
			Success:     entry.Success,
			DurationMs:  entry.DurationMs,
		}
		if err := c.apiClient.PushAudit(dto); err != nil {
			// Log partial failure but continue
			return &domain.SkillResult{
				SkillName: skill.Name,
				Status:    domain.SkillStatusFailed,
				Message:   fmt.Sprintf("Failed after syncing %d/%d entries: %v", syncedCount, len(entries), err),
				Duration:  time.Since(startTime),
				Actions:   []string{fmt.Sprintf("Synced %d entries before failure", syncedCount)},
			}, nil
		}
		syncedCount++
	}

	// Update cursor
	if err := os.WriteFile(cursorPath, []byte(fmt.Sprintf("%d", lastByteOffset)), 0600); err != nil {
		return &domain.SkillResult{
			SkillName: skill.Name,
			Status:    domain.SkillStatusSuccess,
			Message:   fmt.Sprintf("Synced %d entries (cursor update failed: %v)", syncedCount, err),
			Duration:  time.Since(startTime),
			Actions:   []string{fmt.Sprintf("Pushed %d audit entries to Nexus Cloud", syncedCount)},
		}, nil
	}

	return &domain.SkillResult{
		SkillName: skill.Name,
		Status:    domain.SkillStatusSuccess,
		Message:   fmt.Sprintf("Synced %d audit entries to Nexus Cloud", syncedCount),
		Duration:  time.Since(startTime),
		Actions:   []string{fmt.Sprintf("Pushed %d entries to remote compliance API", syncedCount)},
	}, nil
}

func (c *CloudAuditSync) Rollback(project *domain.Project, env *domain.EnvironmentConfig) error {
	return nil // append-only, cannot undo
}

// readNewAuditEntries reads audit entries from the JSONL file that haven't been synced yet.
// Returns the entries and the new byte offset for the cursor.
func readNewAuditEntries(auditPath, cursorPath string) ([]domain.AuditEntry, int64, error) {
	// Read cursor (byte offset into the file)
	var offset int64
	if data, err := os.ReadFile(cursorPath); err == nil {
		fmt.Sscanf(string(data), "%d", &offset)
	}

	f, err := os.Open(auditPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, 0, nil
		}
		return nil, 0, err
	}
	defer f.Close()

	// Seek to the last synced position
	if offset > 0 {
		if _, err := f.Seek(offset, 0); err != nil {
			// If seek fails, read from beginning
			f.Seek(0, 0)
			offset = 0
		}
	}

	var entries []domain.AuditEntry
	scanner := bufio.NewScanner(f)
	// Increase buffer for large lines
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var entry domain.AuditEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			continue // Skip malformed lines
		}
		entries = append(entries, entry)
	}

	if err := scanner.Err(); err != nil {
		return entries, offset, nil // Return what we have
	}

	// Get current file size as new offset
	info, err := f.Stat()
	if err != nil {
		return entries, offset, nil
	}

	return entries, info.Size(), nil
}
