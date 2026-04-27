-- ═══════════════════════════════════════════════════════════════
-- Nexus API — Performance Indexes Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- All statements are idempotent (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- ─── audit_logs (heaviest table — queried on every dashboard/stats load) ───

-- Stats: switches per day, skills executed last 7 days
CREATE INDEX IF NOT EXISTS ix_audit_action_created
  ON audit_logs (action, created_at);

-- Switch count & last switch per project (batch_get_switch_stats)
CREATE INDEX IF NOT EXISTS ix_audit_project_action
  ON audit_logs (project_id, action);

-- Tools connected query (DISTINCT environment WHERE action=cli_switch AND success)
CREATE INDEX IF NOT EXISTS ix_audit_action_success
  ON audit_logs (action, success);

-- General sorting by created_at
CREATE INDEX IF NOT EXISTS ix_audit_created_at
  ON audit_logs (created_at);

-- ─── projects ───

-- list_projects filters by org_id + is_active
CREATE INDEX IF NOT EXISTS ix_projects_org_id
  ON projects (org_id);

-- ─── environment_profiles ───

-- selectinload from projects → environments
CREATE INDEX IF NOT EXISTS ix_envprofiles_project_id
  ON environment_profiles (project_id);

-- ─── subscriptions ───

-- Billing lookups by org
CREATE INDEX IF NOT EXISTS ix_subscriptions_org_id
  ON subscriptions (org_id);

-- ─── organization_members ───

-- Auth middleware: get_user_org_id lookups
CREATE INDEX IF NOT EXISTS ix_orgmembers_user_id
  ON organization_members (user_id);

-- ═══════════════════════════════════════════════════════════════
-- Done! These indexes will dramatically speed up dashboard,
-- stats, audit listing, and project listing queries.
-- ═══════════════════════════════════════════════════════════════
