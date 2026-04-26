import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StatusPill, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { Briefcase, Plus, Sparkles } from "lucide-react";

export default async function ProjectsPage() {
  const me = await requireUser();
  const projects = await prisma.project.findMany({
    where: { OR: [{ designerId: me.id }, { managerId: me.id }] },
    orderBy: { updatedAt: "desc" },
    include: { order: true, designer: true, clientContact: true, manager: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">All projects</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? "project" : "projects"} in scope
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Briefcase className="h-5 w-5" />
            </div>
            <CardTitle>Your first project is one click away</CardTitle>
            <CardSubtitle className="mt-1 max-w-sm">
              Pick a base package, add the extras the client wants, and we&apos;ll generate a
              locked quote with milestones.
            </CardSubtitle>
            <Link className="mt-4 inline-block" href="/dashboard/projects/new">
              <Button variant="accent">
                <Sparkles className="h-4 w-4" /> Build a quote
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="surface group flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{p.title}</span>
                  <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {p.code}
                  {" · "}client {p.clientContact?.email ?? "—"}
                  {" · "}designer {p.designer ? (p.designer.name ?? p.designer.email) : "unclaimed"}
                  {p.manager ? <> · manager {p.manager.name ?? p.manager.email}</> : null}
                </div>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <div className="text-base font-semibold tracking-tight">
                  {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
