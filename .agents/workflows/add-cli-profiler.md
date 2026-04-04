---
description: How to add a new CLI tool profiler to Antigravity
---

# Adding a New CLI Profiler

When you need to support a new CLI tool (e.g., `kubectl`, `gcloud`, `flyctl`):

1. **Create the profiler struct** in `core/internal/adapter/executor/cli_profilers.go`:

```go
type KubectlProfiler struct{}

func NewKubectlProfiler() *KubectlProfiler { return &KubectlProfiler{} }
func (k *KubectlProfiler) ToolName() string { return "kubectl" }
func (k *KubectlProfiler) IsInstalled() bool { ... }
func (k *KubectlProfiler) CurrentProfile() (string, error) { ... }
func (k *KubectlProfiler) Switch(profile domain.CLIProfile) error { ... }
func (k *KubectlProfiler) ListProfiles() ([]string, error) { ... }
```

2. **Register it** in the `AllProfilers()` function at the bottom of the file.

3. **Add test** in `core/internal/adapter/executor/cli_profilers_test.go`.

4. **Update the example config** in `configs/example.antigravity.yaml`.

5. **Update the docs** seed in `database/seeds/seed_plans.sql` if needed.
