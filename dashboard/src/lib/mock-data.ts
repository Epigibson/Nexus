import {
  type Project,
  type AuditEntry,
  type UserProfile,
  type DashboardStats,
  type ActivityData,
  type Skill,
} from "./types";

// ─── Skills Catalog ───

export const SKILLS_CATALOG: Skill[] = [
  {
    id: "sk-1",
    name: "Context Injection",
    description: "Inyecta variables de entorno encriptadas en la sesión activa",
    category: "context-injection",
    icon: "💉",
    enabled: true,
    priority: 1,
    isPremium: false,
  },
  {
    id: "sk-2",
    name: "Git State",
    description: "Asegura que el repositorio esté en la rama correcta",
    category: "git-state",
    icon: "🔀",
    enabled: true,
    priority: 2,
    isPremium: false,
  },
  {
    id: "sk-3",
    name: "CLI Switching",
    description: "Cambia perfiles de autenticación en herramientas CLI",
    category: "cli-switching",
    icon: "🔑",
    enabled: true,
    priority: 3,
    isPremium: false,
  },
  {
    id: "sk-4",
    name: "Documentation",
    description: "Auto-genera documentación técnica desde metadatos",
    category: "documentation",
    icon: "📚",
    enabled: false,
    priority: 4,
    isPremium: true,
  },
  {
    id: "sk-5",
    name: "Sandboxes",
    description: "Crea entornos efímeros aislados con un clic",
    category: "sandbox",
    icon: "🏖️",
    enabled: false,
    priority: 5,
    isPremium: true,
  },
];

// ─── Mock Projects ───

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "SaaS Platform",
    slug: "saas-platform",
    description: "Plataforma SaaS principal con dashboard de clientes y facturación",
    repoUrl: "https://github.com/acme-corp/saas-platform",
    lastSwitch: "2026-04-03T22:15:00Z",
    switchCount: 142,
    isActive: true,
    environments: [
      {
        name: "development",
        branch: "develop",
        envVarCount: 12,
        cliProfiles: [
          { tool: "gh", account: "dev-personal", status: "connected" },
          { tool: "aws", account: "acme-dev", region: "us-east-1", status: "connected" },
          { tool: "supabase", account: "saas-dev-ref", org: "acme", status: "connected" },
          { tool: "vercel", account: "saas-dev", org: "acme-dev", status: "connected" },
          { tool: "mongosh", account: "local-dev", status: "connected" },
        ],
      },
      {
        name: "staging",
        branch: "staging",
        envVarCount: 14,
        cliProfiles: [
          { tool: "gh", account: "acme-bot", status: "connected" },
          { tool: "aws", account: "acme-staging", region: "us-east-1", status: "connected" },
          { tool: "supabase", account: "saas-stg-ref", org: "acme", status: "expired" },
          { tool: "vercel", account: "saas-staging", org: "acme-corp", status: "connected" },
        ],
      },
      {
        name: "production",
        branch: "main",
        envVarCount: 16,
        cliProfiles: [
          { tool: "gh", account: "acme-bot", status: "connected" },
          { tool: "aws", account: "acme-prod", region: "us-east-1", status: "connected" },
          { tool: "supabase", account: "saas-prod-ref", org: "acme", status: "connected" },
          { tool: "vercel", account: "saas-prod", org: "acme-corp", status: "connected" },
          { tool: "mongosh", account: "prod-atlas", status: "connected" },
        ],
      },
    ],
    skills: SKILLS_CATALOG,
  },
  {
    id: "proj-2",
    name: "Mobile API",
    slug: "mobile-api",
    description: "Backend API para las aplicaciones móviles iOS y Android",
    repoUrl: "https://github.com/acme-corp/mobile-api",
    lastSwitch: "2026-04-03T18:30:00Z",
    switchCount: 87,
    isActive: true,
    environments: [
      {
        name: "development",
        branch: "develop",
        envVarCount: 8,
        cliProfiles: [
          { tool: "gh", account: "dev-personal", status: "connected" },
          { tool: "aws", account: "mobile-dev", region: "us-west-2", status: "connected" },
          { tool: "supabase", account: "mobile-dev-ref", status: "connected" },
        ],
      },
      {
        name: "production",
        branch: "main",
        envVarCount: 10,
        cliProfiles: [
          { tool: "gh", account: "acme-bot", status: "connected" },
          { tool: "aws", account: "mobile-prod", region: "us-west-2", status: "connected" },
          { tool: "supabase", account: "mobile-prod-ref", status: "connected" },
        ],
      },
    ],
    skills: SKILLS_CATALOG.filter((s) => !s.isPremium),
  },
  {
    id: "proj-3",
    name: "Landing Page",
    slug: "landing-page",
    description: "Sitio web marketing con Astro y contenido dinámico",
    repoUrl: "https://github.com/acme-corp/landing",
    lastSwitch: "2026-04-02T10:00:00Z",
    switchCount: 34,
    isActive: true,
    environments: [
      {
        name: "development",
        branch: "develop",
        envVarCount: 5,
        cliProfiles: [
          { tool: "gh", account: "dev-personal", status: "connected" },
          { tool: "vercel", account: "landing-dev", org: "acme-marketing", status: "disconnected" },
        ],
      },
      {
        name: "production",
        branch: "main",
        envVarCount: 6,
        cliProfiles: [
          { tool: "gh", account: "acme-bot", status: "connected" },
          { tool: "vercel", account: "landing-prod", org: "acme-marketing", status: "connected" },
        ],
      },
    ],
    skills: SKILLS_CATALOG.filter((s) => s.category !== "sandbox"),
  },
];

// ─── Mock Audit Entries ───

export const MOCK_AUDIT: AuditEntry[] = [
  { id: "au-1", timestamp: "2026-04-03T22:15:00Z", action: "context_switch", projectName: "SaaS Platform", environment: "development", skillName: "", message: "Context switch completado exitosamente", success: true, durationMs: 1240 },
  { id: "au-2", timestamp: "2026-04-03T22:15:00Z", action: "env_inject", projectName: "SaaS Platform", environment: "development", skillName: "context-injection", message: "12 variables inyectadas", success: true, durationMs: 45 },
  { id: "au-3", timestamp: "2026-04-03T22:15:00Z", action: "git_switch", projectName: "SaaS Platform", environment: "development", skillName: "git-state", message: "Rama cambiada: main → develop", success: true, durationMs: 320 },
  { id: "au-4", timestamp: "2026-04-03T22:15:01Z", action: "cli_switch", projectName: "SaaS Platform", environment: "development", skillName: "gh", message: "GitHub: acme-bot → dev-personal", success: true, durationMs: 580 },
  { id: "au-5", timestamp: "2026-04-03T22:15:01Z", action: "cli_switch", projectName: "SaaS Platform", environment: "development", skillName: "aws", message: "AWS: acme-prod → acme-dev", success: true, durationMs: 890 },
  { id: "au-6", timestamp: "2026-04-03T18:30:00Z", action: "context_switch", projectName: "Mobile API", environment: "development", skillName: "", message: "Context switch completado exitosamente", success: true, durationMs: 980 },
  { id: "au-7", timestamp: "2026-04-03T15:45:00Z", action: "cli_switch", projectName: "SaaS Platform", environment: "staging", skillName: "supabase", message: "Supabase link falló: token expirado", success: false, durationMs: 2100 },
  { id: "au-8", timestamp: "2026-04-03T12:00:00Z", action: "context_switch", projectName: "Landing Page", environment: "production", skillName: "", message: "Context switch completado con warnings", success: true, durationMs: 1560 },
  { id: "au-9", timestamp: "2026-04-02T10:00:00Z", action: "context_switch", projectName: "Landing Page", environment: "development", skillName: "", message: "Context switch completado exitosamente", success: true, durationMs: 780 },
  { id: "au-10", timestamp: "2026-04-02T08:30:00Z", action: "error", projectName: "Mobile API", environment: "production", skillName: "aws", message: "AWS SSO login timeout", success: false, durationMs: 30000 },
];

// ─── Mock User ───

export const MOCK_USER: UserProfile = {
  id: "user-1",
  email: "dev@acme-corp.com",
  displayName: "Carlos Dev",
  avatarUrl: "",
  plan: "free",
  projectCount: 3,
  maxProjects: 3,
};

// ─── Mock Stats ───

export const MOCK_STATS: DashboardStats = {
  totalProjects: 3,
  switchesToday: 7,
  skillsExecuted: 28,
  toolsConnected: 4,
};

// ─── Mock Activity (últimos 7 días) ───

export const MOCK_ACTIVITY: ActivityData[] = [
  { day: "Lun", switches: 5 },
  { day: "Mar", switches: 8 },
  { day: "Mié", switches: 12 },
  { day: "Jue", switches: 6 },
  { day: "Vie", switches: 15 },
  { day: "Sáb", switches: 3 },
  { day: "Dom", switches: 7 },
];
