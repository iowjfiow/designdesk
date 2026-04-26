import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Inbox,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

const TONES = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-sky-500 to-cyan-500",
  "from-fuchsia-500 to-pink-500",
];

export default async function DashboardOverview() {
  const me = await requireUser();
  const [projects, wallet, inboxCount, completedCount, activity] = await Promise.all([
    prisma.project.findMany({
      where: { archivedAt: null, OR: [{ designerId: me.id }, { managerId: me.id }] },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { order: true, clientContact: true, milestones: true },
    }),
    prisma.walletEntry.findMany({ where: { userId: me.id } }),
    prisma.project.count({ where: { status: "INCOMING" } }),
    prisma.project.count({
      where: { status: "COMPLETED", OR: [{ designerId: me.id }, { managerId: me.id }] },
    }),
    prisma.activityLog.findMany({
      where: { project: { OR: [{ designerId: me.id }, { managerId: me.id }] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { project: { select: { title: true, code: true } }, actor: { select: { name: true, email: true } } },
    }),
  ]);

  const summary = wallet.reduce(
    (a, e) => {
      if (e.state === "available") a.available += e.amountMinor;
      else if (e.state === "pending") a.pending += e.amountMinor;
      else if (e.state === "locked") a.locked += e.amountMinor;
      return a;
    },
    { available: 0, pending: 0, locked: 0 },
  );

  const activeCount = projects.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status)).length;

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {inboxCount > 0 ? (
          <Link href="/dashboard/inbox">
            <Button variant="outline">
              <Inbox className="h-4 w-4" />
              Inbox
              <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">{inboxCount}</span>
            </Button>
          </Link>
        ) : null}
        <Link href="/dashboard/projects/new">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Stats row — 4 tinted-icon cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={String(projects.length + completedCount)}
          delta={`${activeCount} active`}
          icon={<Briefcase className="h-5 w-5" />}
          tone="indigo"
          trend="up"
        />
        <StatCard
          title="Active Projects"
          value={String(activeCount)}
          delta={`${inboxCount} new in inbox`}
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          trend="up"
        />
        <StatCard
          title="Completed"
          value={String(completedCount)}
          delta="Lifetime"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          trend="up"
        />
        <StatCard
          title="Earnings"
          value={formatMoney(summary.available + summary.pending, "INR")}
          delta={`${formatMoney(summary.locked, "INR")} in escrow`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="sky"
          trend="up"
        />
      </div>

      {/* Two-column: projects card + activity card */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="text-base font-semibold tracking-tight">Recent Projects</div>
              <div className="text-xs text-muted-foreground">Your latest active projects</div>
            </div>
            <Link href="/dashboard/projects" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl accent-gradient text-white shadow-md shadow-indigo-500/30">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold">No projects yet</div>
              <div className="mt-1 max-w-sm text-sm text-muted-foreground">
                Build a structured quote in under a minute. Pick a base package, add formats and extras, get paid.
              </div>
              <Link href="/dashboard/projects/new" className="mt-4">
                <Button variant="accent">
                  <Sparkles className="h-4 w-4" /> Create project
                </Button>
              </Link>
            </div>
          ) : (
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
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-base font-semibold text-white shadow-md`}>
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.clientContact?.company ?? p.clientContact?.name ?? p.clientContact?.email ?? "—"}
                      </div>
                    </div>
                    <div className="hidden w-40 md:block">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <StatusPill status={p.status} />
                    <span className="hidden text-right text-xs font-medium tabular-nums text-foreground/80 lg:block">
                      {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                    </span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="text-base font-semibold tracking-tight">Recent Activity</div>
              <div className="text-xs text-muted-foreground">Latest events on your projects</div>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((a) => {
                const tone = activityTone(a.action);
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${tone.bg} ${tone.fg}`}>
                      {tone.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{prettyAction(a.action)}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.project?.title ?? a.project?.code ?? "—"}
                        {a.actor?.name ? ` · ${a.actor.name}` : ""}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{relTime(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  delta,
  icon,
  tone,
  trend = "up",
}: {
  title: string;
  value: string;
  delta?: string;
  icon: React.ReactNode;
  tone: "indigo" | "emerald" | "amber" | "sky";
  trend?: "up" | "flat";
}) {
  const tones = {
    indigo: "bg-indigo-500/15 text-indigo-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    sky: "bg-sky-500/15 text-sky-300",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        {trend === "up" ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            +
          </span>
        ) : null}
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{title}</div>
      {delta ? <div className="mt-2 text-[11px] text-muted-foreground">{delta}</div> : null}
    </div>
  );
}

function activityTone(action: string): { bg: string; fg: string; icon: React.ReactNode } {
  if (action.includes("approve") || action.includes("complete") || action.includes("release"))
    return { bg: "bg-emerald-500/15", fg: "text-emerald-300", icon: <CheckCircle2 className="h-4 w-4" /> };
  if (action.includes("dispute") || action.includes("reject"))
    return { bg: "bg-rose-500/15", fg: "text-rose-300", icon: <Star className="h-4 w-4" /> };
  if (action.includes("pay") || action.includes("payment") || action.includes("escrow"))
    return { bg: "bg-amber-500/15", fg: "text-amber-300", icon: <DollarSign className="h-4 w-4" /> };
  return { bg: "bg-indigo-500/15", fg: "text-indigo-300", icon: <Sparkles className="h-4 w-4" /> };
}

function prettyAction(action: string) {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function relTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
