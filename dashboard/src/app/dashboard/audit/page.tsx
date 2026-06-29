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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { AuditEntry } from "@/lib/api";

const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  context_switch: { label: "Context Switch", color: "bg-primary/10 text-primary", icon: Zap },
  env_inject: { label: "Env Inject", color: "bg-success/10 text-success", icon: Key },
  git_switch: { label: "Git Switch", color: "bg-chart-3/10 text-chart-3", icon: GitBranch },
  cli_switch: { label: "CLI Switch", color: "bg-warning/10 text-warning", icon: Terminal },
  project_init: { label: "Init", color: "bg-muted text-muted-foreground", icon: FileText },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

interface SwitchGroup {
  id: string;
  entry: AuditEntry;
  children: AuditEntry[];
  totalDuration: number;
  hasErrors: boolean;
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
    const hasErrors = !sw.success || children.some((c) => !c.success);

    return { id: sw.id, entry: sw, children, totalDuration, hasErrors };
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

function ExpandableRow({ group }: { group: SwitchGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { entry, children, totalDuration, hasErrors } = group;
  const action = actionConfig[entry.action] || { label: entry.action, color: "bg-muted text-muted-foreground", icon: FileText };
  const Icon = action.icon;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-[40px]">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          {hasErrors ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
          {formatTimestamp(entry.created_at)}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={`text-[10px] ${action.color} gap-1`}>
            <Icon className="h-3 w-3" />
            {action.label}
          </Badge>
        </TableCell>
        <TableCell className="text-sm font-medium">{entry.project_name}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px] font-mono">
            {entry.environment ?? "—"}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
          {entry.message}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {children.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {children.length} skills
              </Badge>
            )}
            <span className="text-xs font-mono text-muted-foreground">
              {totalDuration > 0 ? `${totalDuration}ms` : `${entry.duration_ms ?? 0}ms`}
            </span>
          </div>
        </TableCell>
      </TableRow>

      {expanded && children.length > 0 && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={8} className="p-0">
            <div className="pl-12 pr-4 py-3">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="text-xs">Skill</TableHead>
                    <TableHead className="text-xs">Mensaje</TableHead>
                    <TableHead className="text-xs text-right">Duración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => {
                    const childAction = actionConfig[child.action] || { label: child.action, color: "bg-muted text-muted-foreground", icon: FileText };
                    const ChildIcon = childAction.icon;
                    return (
                      <TableRow key={child.id} className="border-border/20">
                        <TableCell>
                          {child.success ? (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[9px] ${childAction.color} gap-1`}>
                            <ChildIcon className="h-2.5 w-2.5" />
                            {child.skill_name || childAction.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate">
                          {child.message}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">
                          {child.duration_ms ?? 0}ms
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-muted-foreground">
            Registro inmutable de todos los context switches ejecutados.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por proyecto, skill o mensaje..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterAction} onValueChange={(v) => v && setFilterAction(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-3.5 w-3.5" />
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
              <SelectTrigger className="w-full sm:w-[150px]">
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

      {/* Table */}
      <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            {filtered.length} switch{filtered.length !== 1 && "es"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Entorno</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead className="text-right">Skills / Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((group) => (
                <ExpandableRow key={group.id} group={group} />
              ))}
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
