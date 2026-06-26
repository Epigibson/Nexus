"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { SkillResponse, ProjectResponse } from "@/lib/api";
import {
  Zap,
  Loader2,
  Lock,
  Search,
  Check,
  Crown,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Shield,
  GitBranch,
  Terminal,
  FileText,
  Beaker,
  Code2,
  Layers,
  Cloud,
  Users,
  KeyRound,
  Box,
  Activity,
  Workflow,
  Database,
  Bell,
  ShieldCheck,
  Filter,
  Grid3X3,
  List,
  X,
  Info,
  ExternalLink,
} from "lucide-react";
import { InnovativeLoader } from "@/components/ui/innovative-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Category Configuration ───

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string; gradient: string }> = {
  "git_state": { label: "Git", icon: GitBranch, color: "text-orange-400", gradient: "from-orange-500/20 to-orange-600/5" },
  "cli_switching": { label: "CLI", icon: Terminal, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-600/5" },
  "context_injection": { label: "Context", icon: Layers, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-600/5" },
  "documentation": { label: "Docs", icon: FileText, color: "text-pink-400", gradient: "from-pink-500/20 to-pink-600/5" },
  "sandbox": { label: "Sandbox", icon: Beaker, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-600/5" },
  "scripts": { label: "Scripts", icon: Code2, color: "text-cyan-400", gradient: "from-cyan-500/20 to-cyan-600/5" },
  "parallel": { label: "Parallel", icon: Zap, color: "text-violet-400", gradient: "from-violet-500/20 to-violet-600/5" },
  "cloud_audit": { label: "Audit", icon: Cloud, color: "text-sky-400", gradient: "from-sky-500/20 to-sky-600/5" },
  "team_sync": { label: "Team", icon: Users, color: "text-rose-400", gradient: "from-rose-500/20 to-rose-600/5" },
  "secret_rotation": { label: "Secrets", icon: KeyRound, color: "text-indigo-400", gradient: "from-indigo-500/20 to-indigo-600/5" },
  "container": { label: "Containers", icon: Box, color: "text-sky-400", gradient: "from-sky-500/20 to-sky-600/5" },
  "monitoring": { label: "Monitoring", icon: Activity, color: "text-teal-400", gradient: "from-teal-500/20 to-teal-600/5" },
  "ci_cd": { label: "CI/CD", icon: Workflow, color: "text-purple-400", gradient: "from-purple-500/20 to-purple-600/5" },
  "database": { label: "Database", icon: Database, color: "text-yellow-400", gradient: "from-yellow-500/20 to-yellow-600/5" },
  "notification": { label: "Notify", icon: Bell, color: "text-red-400", gradient: "from-red-500/20 to-red-600/5" },
  "security": { label: "Security", icon: ShieldCheck, color: "text-green-400", gradient: "from-green-500/20 to-green-600/5" },
};

const DEFAULT_CATEGORY = { label: "Other", icon: Zap, color: "text-muted-foreground", gradient: "from-muted/50 to-muted/20" };

// ─── View Modes ───

type ViewMode = "grid" | "list";

export default function SkillsPage() {
  const [catalog, setCatalog] = useState<SkillResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSkills, setProjectSkills] = useState<SkillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "free" | "premium">("all");
  const [planLimits, setPlanLimits] = useState<{ plan: string; limits: Record<string, unknown> } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catalogData, projectsData, limitsData] = await Promise.all([
        api.getSkillCatalog(),
        api.listProjects(),
        api.getPlanLimits(),
      ]);
      setCatalog(catalogData);
      setProjects(projectsData);
      setPlanLimits(limitsData);
      if (projectsData.length > 0) {
        setSelectedProject(projectsData[0].slug);
        setProjectSkills(projectsData[0].skills || []);
      }
    } catch (err) {
      console.error("Error loading skills:", err);
    } finally {
      setLoading(false);
    }
  };

  const onProjectChange = (slug: string) => {
    setSelectedProject(slug);
    const proj = projects.find((p) => p.slug === slug);
    setProjectSkills(proj?.skills || []);
  };

  const isSkillEnabled = (skillId: string) => {
    return projectSkills.some((s) => s.id === skillId && s.is_enabled);
  };

  const handleToggle = async (skill: SkillResponse) => {
    if (!selectedProject) return;
    setToggling(skill.id);
    try {
      const newEnabled = !isSkillEnabled(skill.id);
      await api.toggleSkill(selectedProject, skill.id, newEnabled);

      if (newEnabled) {
        setProjectSkills((prev) => [...prev.filter((s) => s.id !== skill.id), { ...skill, is_enabled: true }]);
        toast.success(`${skill.name} activado`);
      } else {
        setProjectSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, is_enabled: false } : s)));
        toast.success(`${skill.name} desactivado`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar skill");
    } finally {
      setToggling(null);
    }
  };

  const isPremiumPlan = planLimits?.plan === "premium" || planLimits?.plan === "enterprise";

  // ─── Computed Data ───

  const categories = useMemo(() => {
    const cats = new Set(catalog.map((s) => s.category));
    return ["all", ...Array.from(cats)];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((s) => {
      const matchSearch = search === "" || 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "all" || s.category === filterCategory;
      const matchType = filterType === "all" || 
        (filterType === "free" && !s.is_premium) || 
        (filterType === "premium" && s.is_premium);
      return matchSearch && matchCategory && matchType;
    });
  }, [catalog, search, filterCategory, filterType]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; enabled: number }> = {};
    for (const cat of categories) {
      if (cat === "all") continue;
      const catSkills = catalog.filter((s) => s.category === cat);
      const enabledCount = catSkills.filter((s) => isSkillEnabled(s.id)).length;
      stats[cat] = { total: catSkills.length, enabled: enabledCount };
    }
    return stats;
  }, [categories, catalog, projectSkills]);

  const totalEnabled = projectSkills.filter((s) => s.is_enabled).length;
  const totalFree = catalog.filter((s) => !s.is_premium).length;
  const totalPremium = catalog.filter((s) => s.is_premium).length;

  if (loading) {
    return <InnovativeLoader message="Cargando skills..." subMessage="Obteniendo automatizaciones disponibles" />;
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 glass bg-card/30 p-6">
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-violet-500/10 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-fuchsia-500/8 blur-[50px]" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet text-white shadow-lg shadow-violet-500/20">
                <Zap className="h-5 w-5" />
              </div>
              Skills & Automatizaciones
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Configura las automatizaciones que se ejecutan al cambiar de contexto. 
              Cada skill puede transformar tu flujo de trabajo.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <StatCard label="Total" value={catalog.length} icon={Layers} />
            <StatCard label="Activos" value={totalEnabled} icon={Check} color="text-emerald-400" />
            <StatCard label="Premium" value={totalPremium} icon={Crown} color="text-amber-400" />
          </div>
        </div>
      </div>

      {/* ─── Controls Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Project Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-border/50 glass bg-card/40 px-3 py-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedProject || ""} onValueChange={(v) => v && onProjectChange(v)}>
            <SelectTrigger className="border-0 bg-transparent p-0 h-auto focus:ring-0 shadow-none">
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar skills por nombre o descripción..."
            className="w-full rounded-xl border border-border/50 glass bg-card/40 pl-9 pr-10 py-2 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Mode & Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
              showFilters || filterCategory !== "all" || filterType !== "all"
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/50 glass bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {(filterCategory !== "all" || filterType !== "all") && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                {(filterCategory !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0)}
              </span>
            )}
          </button>

          <div className="flex rounded-xl border border-border/50 glass bg-card/40 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 transition-all ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 transition-all ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filters Panel ─── */}
      {showFilters && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-xl border border-border/50 glass bg-card/40 p-4 space-y-4">
          {/* Type Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Tipo</label>
            <div className="flex gap-2">
              {[
                { value: "all", label: "Todos", count: catalog.length },
                { value: "free", label: "Incluidos", count: totalFree },
                { value: "premium", label: "Premium", count: totalPremium },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value as typeof filterType)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all ${
                    filterType === opt.value
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  {opt.label}
                  <span className="text-[10px] opacity-70">({opt.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat] || DEFAULT_CATEGORY;
                const Icon = config.icon;
                const stats = categoryStats[cat];
                const isActive = filterCategory === cat;
                
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                        : cat === "all"
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                        : `${config.color} bg-muted/30 hover:bg-muted/50 border border-transparent`
                    }`}
                  >
                    {cat !== "all" && <Icon className="h-3.5 w-3.5" />}
                    {cat === "all" ? "Todas" : config.label}
                    {stats && (
                      <span className="text-[10px] opacity-70">
                        {stats.enabled}/{stats.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear Filters */}
          {(filterCategory !== "all" || filterType !== "all") && (
            <button
              onClick={() => { setFilterCategory("all"); setFilterType("all"); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ─── Results Info ─── */}
      {(search || filterCategory !== "all" || filterType !== "all") && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando <strong className="text-foreground">{filteredCatalog.length}</strong> de {catalog.length} skills
          </span>
          <button
            onClick={() => { setSearch(""); setFilterCategory("all"); setFilterType("all"); }}
            className="text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ─── Skills Grid/List ─── */}
      {filteredCatalog.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCatalog.map((skill) => (
              <SkillCardGrid
                key={skill.id}
                skill={skill}
                enabled={isSkillEnabled(skill.id)}
                toggling={toggling === skill.id}
                canToggle={!skill.is_premium || isPremiumPlan}
                locked={skill.is_premium && !isPremiumPlan}
                expanded={expandedSkill === skill.id}
                onToggle={() => handleToggle(skill)}
                onExpand={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCatalog.map((skill) => (
              <SkillCardList
                key={skill.id}
                skill={skill}
                enabled={isSkillEnabled(skill.id)}
                toggling={toggling === skill.id}
                canToggle={!skill.is_premium || isPremiumPlan}
                locked={skill.is_premium && !isPremiumPlan}
                onToggle={() => handleToggle(skill)}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No se encontraron skills"
          description="Intenta ajustando los filtros de búsqueda o categoría."
          action={
            <button
              onClick={() => { setSearch(""); setFilterCategory("all"); setFilterType("all"); }}
              className="text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          }
        />
      )}
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, icon: Icon, color = "text-foreground" }: { 
  label: string; 
  value: number; 
  icon: typeof Zap; 
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 glass bg-card/40 px-4 py-3 text-center min-w-[80px]">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ─── Grid Card ───

function SkillCardGrid({
  skill,
  enabled,
  toggling,
  canToggle,
  locked,
  expanded,
  onToggle,
  onExpand,
}: {
  skill: SkillResponse;
  enabled: boolean;
  toggling: boolean;
  canToggle: boolean;
  locked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const config = CATEGORY_CONFIG[skill.category] || DEFAULT_CATEGORY;
  const Icon = config.icon;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-300 glass overflow-hidden ${
        enabled
          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
          : locked
          ? "border-border/30 bg-card/20 opacity-75"
          : "border-border/50 bg-card/40 hover:border-primary/30 hover:shadow-xl hover:shadow-violet-900/10 hover:-translate-y-0.5"
      }`}
    >
      {/* Category Gradient Bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient} ${config.color} ${locked ? "grayscale" : ""}`}>
            <span className="text-xl">{skill.icon || "⚡"}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold truncate">{skill.name}</h3>
              {skill.is_premium && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="h-2 w-2" />
                  PRO
                </span>
              )}
            </div>
            <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {skill.description}
            </p>
          </div>

          {/* Toggle */}
          <div className="shrink-0">
            {locked ? (
              <button
                className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted/80 transition-colors"
                title="Requiere plan Premium"
              >
                <Lock className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onToggle}
                disabled={toggling || !canToggle}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  enabled ? "bg-primary" : "bg-muted-foreground/30"
                } ${toggling ? "opacity-50" : ""}`}
              >
                {toggling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                ) : (
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color} bg-muted/50`}>
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </span>
            {enabled && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Check className="h-2.5 w-2.5" />
                Activo
              </span>
            )}
          </div>
          <button
            onClick={onExpand}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {expanded ? "Menos" : "Más"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List Card ───

function SkillCardList({
  skill,
  enabled,
  toggling,
  canToggle,
  locked,
  onToggle,
}: {
  skill: SkillResponse;
  enabled: boolean;
  toggling: boolean;
  canToggle: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  const config = CATEGORY_CONFIG[skill.category] || DEFAULT_CATEGORY;
  const Icon = config.icon;

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-200 glass ${
        enabled
          ? "border-primary/30 bg-primary/5"
          : locked
          ? "border-border/30 bg-card/20 opacity-75"
          : "border-border/50 bg-card/40 hover:border-primary/20 hover:bg-card/60"
      }`}
    >
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient} ${config.color} ${locked ? "grayscale" : ""}`}>
        <span className="text-lg">{skill.icon || "⚡"}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium truncate">{skill.name}</h3>
          {skill.is_premium && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
              PRO
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
      </div>

      {/* Category */}
      <span className={`hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color} bg-muted/50 shrink-0`}>
        <Icon className="h-2.5 w-2.5" />
        {config.label}
      </span>

      {/* Status */}
      {enabled && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
          <Check className="h-3 w-3" />
          <span className="hidden sm:inline">Activo</span>
        </span>
      )}

      {/* Toggle */}
      {locked ? (
        <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground shrink-0" title="Requiere plan Premium">
          <Lock className="h-3.5 w-3.5" />
        </div>
      ) : (
        <button
          onClick={onToggle}
          disabled={toggling || !canToggle}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
            enabled ? "bg-primary" : "bg-muted-foreground/30"
          } ${toggling ? "opacity-50" : ""}`}
        >
          {toggling ? (
            <Loader2 className="h-3 w-3 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
          ) : (
            <span
              className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          )}
        </button>
      )}
    </div>
  );
}
