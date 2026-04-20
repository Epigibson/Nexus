package audit

import (
	"github.com/nexus-dev/nexus/internal/domain"
	"github.com/nexus-dev/nexus/internal/port"
)

// MultiLogger dispatches audit logs to multiple loggers.
type MultiLogger struct {
	loggers []port.AuditLogger
}

// NewMultiLogger initializes a logger that duplicates entries across all provided loggers.
func NewMultiLogger(loggers ...port.AuditLogger) *MultiLogger {
	return &MultiLogger{loggers: loggers}
}

// Log executes the logging action on all configured loggers synchronously.
func (m *MultiLogger) Log(entry domain.AuditEntry) error {
	var lastErr error
	for _, l := range m.loggers {
		if l != nil {
			// Synchronous execution ensures that short-lived CLI commands 
			// do not exit before background network requests complete.
			if err := l.Log(entry); err != nil {
				lastErr = err
			}
		}
	}
	return lastErr // Returns the last encountered error (best effort)
}

// GetLogs simply delegates to the first configured logger that implements it (usually the local FileLogger).
func (m *MultiLogger) GetLogs(projectName string, limit int) ([]domain.AuditEntry, error) {
	if len(m.loggers) > 0 && m.loggers[0] != nil {
		return m.loggers[0].GetLogs(projectName, limit)
	}
	return nil, nil
}
