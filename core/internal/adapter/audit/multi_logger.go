package audit

import (
	"sync"

	"github.com/nexus-dev/nexus/internal/domain"
	"github.com/nexus-dev/nexus/internal/port"
)

// MultiLogger dispatches audit logs to multiple loggers.
// The first logger (local file) runs synchronously for reliability.
// Subsequent loggers (remote API) run asynchronously to avoid blocking the CLI.
type MultiLogger struct {
	loggers []port.AuditLogger
	wg      sync.WaitGroup
}

// NewMultiLogger initializes a logger that duplicates entries across all provided loggers.
func NewMultiLogger(loggers ...port.AuditLogger) *MultiLogger {
	return &MultiLogger{loggers: loggers}
}

// Log executes the first logger synchronously (local file) and all others
// asynchronously (remote API) to avoid blocking the switch operation.
func (m *MultiLogger) Log(entry domain.AuditEntry) error {
	for i, l := range m.loggers {
		if l == nil {
			continue
		}
		if i == 0 {
			// First logger (local file) — synchronous for reliability
			_ = l.Log(entry)
		} else {
			// Remote loggers — fire in background, tracked by WaitGroup
			m.wg.Add(1)
			go func(logger port.AuditLogger, e domain.AuditEntry) {
				defer m.wg.Done()
				_ = logger.Log(e)
			}(l, entry)
		}
	}
	return nil
}

// Flush waits for all background audit logs to complete.
// Call this before the CLI process exits to ensure remote logs are delivered.
func (m *MultiLogger) Flush() {
	m.wg.Wait()
}

// GetLogs simply delegates to the first configured logger that implements it (usually the local FileLogger).
func (m *MultiLogger) GetLogs(projectName string, limit int) ([]domain.AuditEntry, error) {
	if len(m.loggers) > 0 && m.loggers[0] != nil {
		return m.loggers[0].GetLogs(projectName, limit)
	}
	return nil, nil
}

