-- ============================================================================
-- Antigravity Control Center — Row Level Security Policies
-- Migration: 002_rls_policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES: Users can only CRUD their own profile
-- ============================================================================

CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- ORGANIZATIONS: Scoped by membership
-- ============================================================================

CREATE POLICY "Members can view their organizations"
    ON organizations FOR SELECT
    USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only owners can update organizations"
    ON organizations FOR UPDATE
    USING (is_org_admin(id))
    WITH CHECK (is_org_admin(id));

CREATE POLICY "Only owners can delete organizations"
    ON organizations FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================================================
-- ORGANIZATION MEMBERS: Scoped by organization
-- ============================================================================

CREATE POLICY "Members can view org members"
    ON organization_members FOR SELECT
    USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Admins can add members"
    ON organization_members FOR INSERT
    WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can update member roles"
    ON organization_members FOR UPDATE
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can remove members"
    ON organization_members FOR DELETE
    USING (is_org_admin(org_id));

-- ============================================================================
-- PROJECTS: Scoped by organization membership
-- ============================================================================

CREATE POLICY "Members can view projects in their orgs"
    ON projects FOR SELECT
    USING (org_id IN (SELECT get_user_org_ids()));

-- Freemium enforcement: Free plan = max 3 projects
CREATE POLICY "Members can create projects within limits"
    ON projects FOR INSERT
    WITH CHECK (
        org_id IN (SELECT get_user_org_ids())
        AND (
            -- Premium/Enterprise: unlimited
            (SELECT plan FROM organizations WHERE id = org_id) IN ('premium', 'enterprise')
            OR
            -- Free: max 3 active projects
            count_org_projects(org_id) < 3
        )
    );

CREATE POLICY "Admins can update projects"
    ON projects FOR UPDATE
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can delete projects"
    ON projects FOR DELETE
    USING (is_org_admin(org_id));

-- ============================================================================
-- SKILL DEFINITIONS: Readable by all authenticated users (global catalog)
-- ============================================================================

CREATE POLICY "All authenticated users can view skill definitions"
    ON skill_definitions FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only service_role can manage skill definitions (admin only)

-- ============================================================================
-- SKILL CONFIGURATIONS: Scoped by project → organization
-- ============================================================================

CREATE POLICY "Members can view skill configs for their projects"
    ON skill_configurations FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.org_id IN (SELECT get_user_org_ids())
        )
    );

CREATE POLICY "Admins can manage skill configs"
    ON skill_configurations FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE is_org_admin(p.org_id)
        )
    );

CREATE POLICY "Admins can update skill configs"
    ON skill_configurations FOR UPDATE
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE is_org_admin(p.org_id)
        )
    );

CREATE POLICY "Admins can delete skill configs"
    ON skill_configurations FOR DELETE
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE is_org_admin(p.org_id)
        )
    );

-- ============================================================================
-- ENVIRONMENT PROFILES: Scoped by project → organization
-- ============================================================================

CREATE POLICY "Members can view env profiles for their projects"
    ON environment_profiles FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.org_id IN (SELECT get_user_org_ids())
        )
    );

CREATE POLICY "Admins can manage env profiles"
    ON environment_profiles FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE is_org_admin(p.org_id)
        )
    );

-- ============================================================================
-- AUDIT LOGS: INSERT-only for members, readable by admins
-- ============================================================================

CREATE POLICY "Members can insert audit logs for their orgs"
    ON audit_logs FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND org_id IN (SELECT get_user_org_ids())
    );

CREATE POLICY "Admins can read audit logs for their orgs"
    ON audit_logs FOR SELECT
    USING (
        is_org_admin(org_id)
        OR user_id = auth.uid()
    );

-- No UPDATE or DELETE policies — audit logs are immutable via trigger

-- ============================================================================
-- SUBSCRIPTIONS: Scoped by organization (admin only)
-- ============================================================================

CREATE POLICY "Admins can view their org subscriptions"
    ON subscriptions FOR SELECT
    USING (is_org_admin(org_id));

-- Only service_role can manage subscriptions (webhook handler)
