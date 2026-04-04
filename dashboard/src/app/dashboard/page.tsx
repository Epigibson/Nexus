"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  ArrowRightLeft,
  Cpu,
  Plug,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { api } from "@/lib/api";
import type {
  DashboardStats,
  ActivityPoint,
  RecentSwitch,
  ProjectResponse,
} from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [recent, setRecent] = useState<RecentSwitch[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, a, r, p] = await Promise.all([
          api.getStats(),
          api.getActivity(),
          api.getRecentSwitches(5),
          api.listProjects(),
        ]);
        setStats(s);
        setActivity(a);
        setRecent(r);
        setProjects(p);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Proyectos Activos",
      value: stats?.total_projects ?? 0,
      icon: FolderKanban,
      description: `de 3 permitidos (free)`,
      trend: "Configurados",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Switches Hoy",
      value: stats?.switches_today ?? 0,
      icon: ArrowRightLeft,
      description: "context switches ejecutados",
      trend: "Últimas 24h",
      color: "text-teal",
      bgColor: "bg-teal/10",
    },
    {
      title: "Skills Ejecutados",
      value: stats?.skills_executed ?? 0,
      icon: Cpu,
      description: "en los últimos 7 días",
      trend: "Actividad reciente",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Tools Conectados",
      value: `${stats?.tools_connected ?? 0}/5`,
      icon: Plug,
      description: "CLI tools activos",
      trend: "Estado actual",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido de vuelta 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Resumen de tu actividad de desarrollo y estado de herramientas.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {stat.description}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                <TrendingUp className="h-3 w-3" />
                {stat.trend}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-[2px] w-full opacity-0 transition-opacity group-hover:opacity-100 gradient-violet" />
          </Card>
        ))}
      </div>

      {/* Activity Chart + Recent Switches */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Actividad Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={activity} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Switches Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin actividad reciente
              </p>
            ) : (
              recent.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  {entry.success ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {entry.project_name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[9px] font-mono"
                      >
                        {entry.environment}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(entry.created_at).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {entry.duration_ms != null && ` · ${entry.duration_ms}ms`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acceso Rápido a Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/dashboard/projects/${project.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-150 hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {project.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {project.environments.length} entornos ·{" "}
                    {project.switch_count} switches
                  </div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
