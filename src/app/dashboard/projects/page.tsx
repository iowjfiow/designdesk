import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { StatusPill, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { Archive, Briefcase, Calendar, Plus, Search, Sparkles } from "lucide-react";

const TONES = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-sky-500 to-cyan-500",
  "from-fuchsia-500 to-pink-500",
];

type Tab = "active" | "in_progress" | "completed" | "archived";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const tab: Tab = (["active", "in_progress", "completed", "archived"].includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "active");

  const baseWhere = { OR: [{ designerId: me.id }, { managerId: me.id }] };

  const [active, inProgress, completed, archived] = await Promise.all([
    prisma.project.count({
      where: { ...baseWhere, archivedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.project.count({
      where: { ...baseWhere, archivedAt: null, status: { in: ["IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"] } },
    }),
    prisma.project.count({
      where: { ...baseWhere, archivedAt: null, status: "COMPLETED" },
    }),
    prisma.project.count({ where: { ...baseWhere, archivedAt: { not: null } } }),
  ]);

  const where: Prisma.ProjectWhereInput = (() => {
    if (tab === "in_progress")
      return { ...baseWhere, archivedAt: null, status: { in: ["IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"] } };
    if (tab === "completed") return { ...baseWhere, archivedAt: null, status: "COMPLETED" };
    if (tab === "archived") return { ...baseWhere, archivedAt: { not: null } };
    return { ...baseWhere, archivedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } };
  })();

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { order: true, designer: true, clientContact: true, manager: true, milestones: true },
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: active },
    { key: "in_progress", label: "In progress", count: inProgress },
    { key: "completed", label: "Completed", count: completed },
    { key: "archived", label: "Archived", count: archived },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage every project in one place.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/40 p-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/dashboard/projects?tab=${t.key}`}
              className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent text-accent-foreground shadow-[0_4px_14px_-4px_rgba(99,102,241,0.55)]"
                  : "text-foreground/70 hover:bg-muted"
              }`}
            >
              {t.key === "archived" ? <Archive className="h-3.5 w-3.5" /> : null}
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient text-white shadow-lg shadow-indigo-500/30">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle>{tab === "archived" ? "No archived projects" : "Your first project is one click away"}</CardTitle>
            <CardSubtitle className="mt-1 max-w-sm">
              {tab === "archived"
                ? "Once you mark a completed project as archived it'll show up here."
                : "Pick a base package, add the extras the client wants, and we'll generate a locked quote with milestones."}
            </CardSubtitle>
            {tab !== "archived" ? (
              <Link className="mt-4 inline-block" href="/dashboard/projects/new">
                <Button variant="accent">
                  <Sparkles className="h-4 w-4" /> Build a quote
                </Button>
              </Link>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="hidden grid-cols-[44px_1.5fr_1fr_140px_140px_120px_24px] gap-4 border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:grid">
            <span />
            <span>Project</span>
            <span>Progress</span>
            <span>Status</span>
            <span>Deadline</span>
            <span>Client</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {projects.map((p) => {
              const total = p.milestones.reduce((s, m) => s + m.amountMinor, 0);
              const released = p.milestones.filter((m) => m.status === "APPROVED").reduce((s, m) => s + m.amountMinor, 0);
              const pct = total === 0 ? 0 : Math.round((released / total) * 100);
              const initial = (p.title || p.code).slice(0, 1).toUpperCase();
              const tone = TONES[(p.code.charCodeAt(p.code.length - 1) ?? 0) % TONES.length];
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className="grid grid-cols-[44px_1.5fr_1fr_140px_140px_120px_24px] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-base font-semibold text-white shadow-md`}>
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{p.title}</span>
                      {p.archivedAt ? <Badge variant="muted">archived</Badge> : null}
                      <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{p.code}</span>
                      {" · "}{p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="hidden lg:block"><StatusPill status={p.status} /></div>
                  <div className="hidden text-xs text-muted-foreground lg:flex lg:items-center lg:gap-1">
                    <Calendar className="h-3 w-3" />
                    {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
                  </div>
                  <div className="hidden truncate text-xs text-muted-foreground lg:block">
                    {p.clientContact?.company ?? p.clientContact?.name ?? p.clientContact?.email ?? "—"}
                  </div>
                  <Search className="hidden h-3.5 w-3.5 -rotate-45 text-muted-foreground lg:block" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
