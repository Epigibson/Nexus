package state

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nexus-dev/nexus/internal/domain"
)

func TestSaveAndLoadActiveState(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("HOME", tempDir)

	state := domain.ActiveState{
		ProjectName: "test-project",
		Environment: "production",
		Timestamp:   time.Now().Truncate(time.Second), // Truncate to avoid precision issues in JSON
	}

	err := SaveActiveState(state)
	if err != nil {
		t.Fatalf("SaveActiveState failed: %v", err)
	}

	loadedState, err := LoadActiveState()
	if err != nil {
		t.Fatalf("LoadActiveState failed: %v", err)
	}

	if loadedState.ProjectName != state.ProjectName {
		t.Errorf("expected ProjectName %q, got %q", state.ProjectName, loadedState.ProjectName)
	}
	if loadedState.Environment != state.Environment {
		t.Errorf("expected Environment %q, got %q", state.Environment, loadedState.Environment)
	}
	// JSON might not preserve monotonic clock, so Equal is better than ==
	if !loadedState.Timestamp.Equal(state.Timestamp) {
		t.Errorf("expected Timestamp %v, got %v", state.Timestamp, loadedState.Timestamp)
	}
}

func TestLoadActiveState_NotExist(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("HOME", tempDir)

	_, err := LoadActiveState()
	if err == nil {
		t.Fatal("expected error when state file does not exist, got nil")
	}
	if !os.IsNotExist(err) {
		t.Errorf("expected os.IsNotExist error, got %v", err)
	}
}

func TestLoadActiveState_InvalidJSON(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("HOME", tempDir)

	stateDir := filepath.Join(tempDir, ".nexus")
	if err := os.MkdirAll(stateDir, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(stateDir, "state.json"), []byte("{invalid json"), 0600); err != nil {
		t.Fatal(err)
	}

	_, err := LoadActiveState()
	if err == nil {
		t.Fatal("expected error when state file is invalid JSON, got nil")
	}
}

func TestSaveActiveState_DirCreationError(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("HOME", tempDir)

	// Create a file where the directory should be
	stateDirPath := filepath.Join(tempDir, ".nexus")
	if err := os.WriteFile(stateDirPath, []byte("not a directory"), 0600); err != nil {
		t.Fatal(err)
	}

	state := domain.ActiveState{
		ProjectName: "test",
	}

	err := SaveActiveState(state)
	if err == nil {
		t.Fatal("expected error when directory creation fails, got nil")
	}
}
