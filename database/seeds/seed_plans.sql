-- ============================================================================
-- Antigravity Control Center — Seed Data
-- Seeds: Skill definitions + Default plans
-- ============================================================================

-- ============================================================================
-- SKILL DEFINITIONS (the 5 core skills)
-- ============================================================================

INSERT INTO skill_definitions (name, description, version, category, is_premium, icon, schema) VALUES

('context-injection',
 'Inject encrypted environment variables into the active terminal session. Supports PowerShell, Bash, and Zsh.',
 '1.0.0', 'context-injection', false, '💉',
 '{"type": "object", "properties": {"auto_source": {"type": "boolean", "default": true}}}'
),

('git-state',
 'Ensure the repository is on the correct branch for the target environment. Automatically checks out the configured branch.',
 '1.0.0', 'git-state', false, '🔀',
 '{"type": "object", "properties": {"stash_changes": {"type": "boolean", "default": false}, "pull_after_checkout": {"type": "boolean", "default": false}}}'
),

('cli-switching',
 'Switch authentication profiles across all configured CLI tools (GitHub, AWS, Supabase, Vercel, MongoDB, etc.).',
 '1.0.0', 'cli-switching', false, '🔑',
 '{"type": "object", "properties": {"tools": {"type": "array", "items": {"type": "string"}}, "parallel": {"type": "boolean", "default": false}}}'
),

('documentation',
 'Auto-generate technical and functional documentation from project metadata. Export to Mintlify or Docusaurus format.',
 '1.0.0', 'documentation', true, '📚',
 '{"type": "object", "properties": {"format": {"type": "string", "enum": ["mintlify", "docusaurus"]}, "output_dir": {"type": "string"}}}'
),

('sandbox',
 'Create isolated ephemeral environments with one click. Provisions feature branches with dedicated Vercel previews and Supabase branches.',
 '1.0.0', 'sandbox', true, '🏖️',
 '{"type": "object", "properties": {"prefix": {"type": "string", "default": "sandbox-"}, "auto_cleanup_hours": {"type": "integer", "default": 72}, "providers": {"type": "array", "items": {"type": "string", "enum": ["vercel", "supabase"]}}}}'
);

-- ============================================================================
-- NOTE: Organizations and subscriptions are created dynamically when
-- users sign up. The free plan defaults are enforced via:
--   - organizations.plan DEFAULT 'free'
--   - organizations.max_projects DEFAULT 3
--   - organizations.max_members DEFAULT 1
--   - RLS policy on projects INSERT (count_org_projects < 3 for free)
-- ============================================================================
