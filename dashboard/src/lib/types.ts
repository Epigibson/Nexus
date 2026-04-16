// ─── Nexus Domain Types ───

export type PlanTier = "free" | "premium" | "enterprise";
export type Environment = "development" | "staging" | "production";
export type SkillCategory = "context-injection" | "git-state" | "cli-switching" | "documentation" | "sandbox";
export type AuditAction = "context_switch" | "env_inject" | "git_switch" | "cli_switch" | "project_init" | "error";

export interface CLIProfile {
  tool: string;
  account: string;
  org?: string;
  region?: string;
  extra?: Record<string, string>;
  status: "connected" | "disconnected" | "expired";
}

export interface EnvironmentConfig {
  name: Environment;
  branch: string;
  envVarCount: number;
  cliProfiles: CLIProfile[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon: string;
  enabled: boolean;
  priority: number;
  isPremium: boolean;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  repoUrl: string;
  environments: EnvironmentConfig[];
  skills: Skill[];
  lastSwitch: string;
  switchCount: number;
  isActive: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  projectName: string;
  environment: string;
  skillName: string;
  message: string;
  success: boolean;
  durationMs: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  plan: PlanTier;
  projectCount: number;
  maxProjects: number;
}

export interface DashboardStats {
  totalProjects: number;
  switchesToday: number;
  skillsExecuted: number;
  toolsConnected: number;
}

export interface ActivityData {
  day: string;
  switches: number;
}
