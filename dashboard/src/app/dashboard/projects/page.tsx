"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  ArrowRightLeft,
  Clock,
  Plus,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { ProjectResponse } from "@/lib/api";

const toolIcons: Record<string, string> = {
  gh: "GitHub",
  aws: "AWS",
  supabase: "Supabase",
  vercel: "Vercel",
  mongosh: "MongoDB",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona tus proyectos y sus configuraciones de entorno.
          </p>
        </div>
        <Button className="gap-2 gradient-violet text-white hover:opacity-90 border-0">
          <Plus className="h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Project Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const totalProfiles = project.environments.reduce(
            (acc, env) => acc + env.cli_profiles.length,
            0
          );
          const connectedProfiles = project.environments.reduce(
            (acc, env) =>
              acc +
              env.cli_profiles.filter((p) => p.status === "connected").length,
            0
          );

          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.slug}`}
            >
              <Card className="group h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-violet text-white font-bold text-lg shadow-lg shadow-primary/20">
                        {project.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <p className="text-xs font-mono text-muted-foreground">
                          {project.slug}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  {/* Environments */}
                  <div className="flex flex-wrap gap-1.5">
                    {project.environments.map((env) => (
                      <Badge
                        key={env.name}
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        <GitBranch className="mr-1 h-3 w-3" />
                        {env.name}
                      </Badge>
                    ))}
                  </div>

                  <Separator />

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      <span>{project.switch_count} switches</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {project.last_switch
                          ? new Date(project.last_switch).toLocaleDateString(
                              "es-MX",
                              { month: "short", day: "numeric" }
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-success" />
                      <span>
                        {connectedProfiles}/{totalProfiles} tools
                      </span>
                    </div>
                  </div>

                  {/* Connected Tools */}
                  <div className="flex flex-wrap gap-1">
                    {Array.from(
                      new Set(
                        project.environments.flatMap((e) =>
                          e.cli_profiles.map((p) => p.tool)
                        )
                      )
                    ).map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {toolIcons[tool] || tool}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
