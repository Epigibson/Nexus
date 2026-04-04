package audit

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/antigravity-dev/antigravity/internal/domain"
)

// FileLogger implements port.AuditLogger using an append-only JSON Lines file.
// Each line is a complete JSON object representing an AuditEntry.
// The file is stored at ~/.antigravity/audit.jsonl
type FileLogger struct {
	filePath string
}

// NewFileLogger creates a FileLogger, ensuring the directory exists.
func NewFileLogger(customPath ...string) (*FileLogger, error) {
	var logPath string

	if len(customPath) > 0 && customPath[0] != "" {
		logPath = customPath[0]
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("cannot determine home directory: %w", err)
		}
		logPath = filepath.Join(home, ".antigravity", "audit.jsonl")
	}

	// Ensure directory exists
	dir := filepath.Dir(logPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("cannot create audit directory '%s': %w", dir, err)
	}

	return &FileLogger{filePath: logPath}, nil
}

// Log appends an audit entry to the log file. This operation is append-only
// and atomic — partial writes are avoided using a complete line write.
func (fl *FileLogger) Log(entry domain.AuditEntry) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("failed to marshal audit entry: %w", err)
	}

	// Open file in append mode, create if not exists
	f, err := os.OpenFile(fl.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("failed to open audit log: %w", err)
	}
	defer f.Close()

	// Write the JSON line with a newline terminator
	if _, err := f.Write(append(data, '\n')); err != nil {
		return fmt.Errorf("failed to write audit entry: %w", err)
	}

	return nil
}

// GetLogs retrieves audit entries for a project, newest first.
func (fl *FileLogger) GetLogs(projectName string, limit int) ([]domain.AuditEntry, error) {
	data, err := os.ReadFile(fl.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No logs yet
		}
		return nil, fmt.Errorf("failed to read audit log: %w", err)
	}

	var entries []domain.AuditEntry
	lines := splitLines(data)

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}
		var entry domain.AuditEntry
		if err := json.Unmarshal(line, &entry); err != nil {
			continue // Skip malformed lines
		}
		if projectName == "" || entry.ProjectName == projectName {
			entries = append(entries, entry)
		}
	}

	// Sort by timestamp descending (newest first)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Timestamp.After(entries[j].Timestamp)
	})

	// Apply limit
	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}

	return entries, nil
}

// splitLines splits byte data into individual lines.
func splitLines(data []byte) [][]byte {
	var lines [][]byte
	start := 0
	for i, b := range data {
		if b == '\n' {
			if i > start {
				lines = append(lines, data[start:i])
			}
			start = i + 1
		}
	}
	if start < len(data) {
		lines = append(lines, data[start:])
	}
	return lines
}
