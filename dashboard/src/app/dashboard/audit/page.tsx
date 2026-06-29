"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  Zap,
  GitBranch,
  Terminal,
  Key,
  FileText,
  AlertTriangle,
  Clock,
  SkipForward,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AuditEntry } from "@/lib/api";

const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  context_switch: { label: "Context Switch", color: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Zap },
  env_inject: { label: "Env Inject", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Key },
  git_switch: { label: "Git Switch", color: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: GitBranch },
  cli_switch: { label: "CLI Switch", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Terminal },
  project_init: { label: "Init", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileText },
  error: { label: "Error", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
};

type SkillStatus = "success" | "warning" | "error";

function getSkillStatus(entry: AuditEntry): SkillStatus {
  if (entry.success) return "success";
  const msg = entry.message.toLowerCase();
  if (
    msg.includes("skipped") ||
    msg.includes("not installed") ||
    msg.includes("not authenticated") ||
    msg.includes("not defined") ||
    msg.includes("disabled") ||
    msg.includes("no commands") ||
    msg.includes("no branch") ||
    msg.includes("no env")
  ) {
    return "warning";
  }
  return "error";
}

interface SwitchGroup {
  id: string;
  entry: AuditEntry;
  children: AuditEntry[];
  totalDuration: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
}

function groupBySwitches(entries: AuditEntry[]): SwitchGroup[] {
  const switches = entries.filter((e) => e.action === "context_switch");
  const others = entries.filter((e) => e.action !== "context_switch");

  return switches.map((sw) => {
    const swTime = new Date(sw.created_at).getTime();
    const children = others.filter((e) => {
      const eTime = new Date(e.created_at).getTime();
      return Math.abs(eTime - swTime) < 15000 && e.project_name === sw.project_name;
    });
    const totalDuration = children.reduce((sum, c) => sum + (c.duration_ms || 0), 0);

    let successCount = 0, warningCount = 0, errorCount = 0;
    for (const c of children) {
      const s = getSkillStatus(c);
      if (s === "success") successCount++;
      else if (s === "warning") warningCount++;
      else errorCount++;
    }

    return { id: sw.id, entry: sw, children, totalDuration, successCount, warningCount, errorCount };
  });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status, size = "md" }: { status: SkillStatus; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  if (status === "success") return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (status === "warning") return <SkipForward className={`${cls} text-amber-400`} />;
  return <XCircle className={`${cls} text-red-400`} />;
}

function ExpandableRow({ group }: { group: SwitchGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { entry, children, totalDuration, successCount, warningCount, errorCount } = group;
  const action = actionConfig[entry.action] || { label: entry.action, color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileText };
  const Icon = action.icon;

  const groupStatus: SkillStatus = errorCount > 0 ? "error" : "success";

  return (
    <div className="group/row">
      <div
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand chevron */}
        <div className="w-5 flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover/row:text-muted-foreground transition-colors" />
          )}
        </div>

        {/* Status */}
        <StatusIcon status={groupStatus} />

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 w-[160px] flex-shrink-0">
          <Clock className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground font-mono">{formatTimestamp(entry.created_at)}</span>
        </div>

        {/* Project + Env */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{entry.project_name}</span>
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5 border-white/10">
              {entry.environment ?? "—"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{entry.message}</p>
        </div>

        {/* Skills summary */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400/80">
              <CheckCircle2 className="h-3 w-3" /> {successCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/80">
              <SkipForward className="h-3 w-3" /> {warningCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-400/80">
              <XCircle className="h-3 w-3" /> {errorCount}
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="w-[70px] text-right flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground">
            {formatDuration(totalDuration > 0 ? totalDuration : entry.duration_ms ?? 0)}
          </span>
        </div>
      </div>

      {/* Expanded children */}
      {expanded && children.length > 0 && (
        <div className="ml-9 mr-4 mb-2 rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden">
          {children.map((child) => {
            const childAction = actionConfig[child.action] || { label: child.action, color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: FileText };
            const ChildIcon = childAction.icon;
            const childStatus = getSkillStatus(child);
            return (
              <div
                key={child.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <StatusIcon status={childStatus} size="sm" />
                <Badge variant="outline" className={`text-[10px] gap-1 px-1.5 py-0 h-4 border-white/10 ${childAction.color}`}>
                  <ChildIcon className="h-2.5 w-2.5" />
                  {child.skill_name || childAction.label}
                </Badge>
                <span className="flex-1 text-[11px] text-muted-foreground/70 truncate">{child.message}</span>
                <span className="text-[10px] font-mono text-muted-foreground/40 w-[50px] text-right">
                  {formatDuration(child.duration_ms ?? 0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { action?: string; success?: boolean; limit?: number } = { limit: 200 };
      if (filterAction !== "all") params.action = filterAction;
      if (filterStatus === "success") params.success = true;
      if (filterStatus === "error") params.success = false;

      const data = await api.listAudit(params);
      setEntries(data);
    } catch (err) {
      console.error("Error loading audit:", err);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groups = groupBySwitches(entries);

  const filtered = groups.filter((group) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesParent =
        group.entry.message.toLowerCase().includes(q) ||
        (group.entry.project_name || "").toLowerCase().includes(q);
      const matchesChild = group.children.some(
        (c) =>
          c.message.toLowerCase().includes(q) ||
          (c.skill_name || "").toLowerCase().includes(q)
      );
      return matchesParent || matchesChild;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Registro inmutable de todos los context switches ejecutados.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 border-white/10 hover:bg-white/[0.04]">
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                placeholder="Buscar por proyecto, skill o mensaje..."
                className="pl-9 border-white/[0.08] bg-white/[0.02] focus:border-white/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterAction} onValueChange={(v) => v && setFilterAction(v)}>
              <SelectTrigger className="w-full sm:w-[180px] border-white/[0.08] bg-white/[0.02]">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground/40" />
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="context_switch">Context Switch</SelectItem>
                <SelectItem value="cli_switch">CLI Switch</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
              <SelectTrigger className="w-full sm:w-[150px] border-white/[0.08] bg-white/[0.02]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Exitosos</SelectItem>
                <SelectItem value="error">Fallidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit List */}
      <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-white/[0.04] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground/70">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              ) : null}
              {filtered.length} switch{filtered.length !== 1 && "es"}
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400/50" /> OK</span>
              <span className="flex items-center gap-1"><SkipForward className="h-3 w-3 text-amber-400/50" /> Skipped</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-400/50" /> Error</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {filtered.length === 0 && !loading ? (
            <div className="text-center text-muted-foreground/40 py-12 text-sm">
              No se encontraron registros.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((group) => (
                <ExpandableRow key={group.id} group={group} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
