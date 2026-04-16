-- ============================================================================
-- Nexus Control Center — Database Schema
-- Migration: 001_initial_schema
-- Database: Supabase (PostgreSQL 15+)
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE plan_tier AS ENUM ('free', 'premium', 'enterprise');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE environment_type AS ENUM ('development', 'staging', 'production', 'custom');
CREATE TYPE skill_category AS ENUM ('context-injection', 'git-state', 'cli-switching', 'documentation', 'sandbox');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
CREATE TYPE audit_action AS ENUM (
    'context_switch', 'env_inject', 'git_switch', 'cli_switch',
    'project_init', 'project_create', 'project_delete',
    'skill_enable', 'skill_disable', 'profile_update',
    'member_invite', 'member_remove', 'error'
);

-- ============================================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    display_name TEXT,
    avatar_url  TEXT,
    plan        plan_tier NOT NULL DEFAULT 'free',
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ORGANIZATIONS (multi-tenant support)
-- ============================================================================

CREATE TABLE organizations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    plan         plan_tier NOT NULL DEFAULT 'free',
    max_projects INT NOT NULL DEFAULT 3,
    max_members  INT NOT NULL DEFAULT 1,
    metadata     JSONB DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

CREATE TABLE organization_members (
    org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role      org_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    slug           TEXT NOT NULL,
    description    TEXT,
    repo_url       TEXT,
    default_branch TEXT DEFAULT 'main',
    is_active      BOOLEAN NOT NULL DEFAULT true,
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, slug)
);

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SKILL DEFINITIONS (global catalog of available skills)
-- ============================================================================

CREATE TABLE skill_definitions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    version     TEXT NOT NULL DEFAULT '1.0.0',
    category    skill_category NOT NULL,
    is_premium  BOOLEAN NOT NULL DEFAULT false,
    schema      JSONB DEFAULT '{}',    -- JSON Schema for skill config validation
    icon        TEXT,                   -- Emoji or icon identifier
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SKILL CONFIGURATIONS (per-project skill settings)
-- ============================================================================

CREATE TABLE skill_configurations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
    config      JSONB DEFAULT '{}',
    is_enabled  BOOLEAN NOT NULL DEFAULT true,
    priority    INT NOT NULL DEFAULT 10,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, skill_id)
);

CREATE TRIGGER skill_configurations_updated_at
    BEFORE UPDATE ON skill_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ENVIRONMENT PROFILES (per-project, per-environment CLI configs)
-- ============================================================================

CREATE TABLE environment_profiles (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    environment    environment_type NOT NULL DEFAULT 'development',
    git_branch     TEXT,
    encrypted_vars BYTEA,                -- AES-256-GCM encrypted env vars blob
    cli_profiles   JSONB DEFAULT '[]',   -- Array of CLIProfile objects
    cloud_config   JSONB DEFAULT '{}',   -- Cloud provider specific configs
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, name)
);

CREATE TRIGGER environment_profiles_updated_at
    BEFORE UPDATE ON environment_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- AUDIT LOGS (immutable — INSERT only, no UPDATE/DELETE)
-- ============================================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    skill_id    UUID REFERENCES skill_definitions(id) ON DELETE SET NULL,
    action      audit_action NOT NULL,
    message     TEXT NOT NULL,
    details     JSONB DEFAULT '{}',
    ip_address  INET,
    user_agent  TEXT,
    success     BOOLEAN NOT NULL DEFAULT true,
    duration_ms INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent updates and deletes on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_logs_immutable_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- SUBSCRIPTIONS (Stripe integration ready)
-- ============================================================================

CREATE TABLE subscriptions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    plan                   plan_tier NOT NULL DEFAULT 'free',
    status                 subscription_status NOT NULL DEFAULT 'active',
    current_period_start   TIMESTAMPTZ,
    current_period_end     TIMESTAMPTZ,
    metadata               JSONB DEFAULT '{}',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_slug ON projects(org_id, slug);
CREATE INDEX idx_skill_configs_project ON skill_configurations(project_id);
CREATE INDEX idx_env_profiles_project ON environment_profiles(project_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current user's organization memberships
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin/owner of an organization
CREATE OR REPLACE FUNCTION is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE org_id = target_org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Count projects for an organization (for freemium limit enforcement)
CREATE OR REPLACE FUNCTION count_org_projects(target_org_id UUID)
RETURNS INT AS $$
    SELECT COUNT(*)::INT FROM projects WHERE org_id = target_org_id AND is_active = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;
