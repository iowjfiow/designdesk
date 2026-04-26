import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardSubtitle, CardTitle, StatCard } from "@/components/ui/Card";
import { StatusPill, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { ArrowRight, Briefcase, Plus, Wallet, Clock } from "lucide-react";

export default async function DashboardOverview() {
  const me = await requireUser();
  const [projects, wallet, unread] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ designerId: me.id }, { managerId: me.id }] },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { order: true, clientContact: true },
    }),
    prisma.walletEntry.findMany({ where: { userId: me.id } }),
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {me.name?.split(" ")[0] ?? me.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium text-foreground">{me.role}</span>
            {unread > 0 ? <> · <span className="text-warning">{unread} unread</span></> : null}
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Available"
          value={formatMoney(summary.available, "INR")}
          hint="Ready to withdraw"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="In escrow"
          value={formatMoney(summary.locked, "INR")}
          hint="Locked until milestones approved"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending"
          value={formatMoney(summary.pending, "INR")}
          hint="Approved, settling"
        />
        <StatCard
          icon={<Briefcase className="h-4 w-4" />}
          label="Active projects"
          value={activeCount}
          hint={`${projects.length} total in view`}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent projects</h2>
          <Link className="inline-flex items-center gap-1 text-sm text-accent hover:underline" href="/dashboard/projects">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle>No projects yet</CardTitle>
              <CardSubtitle className="mt-1">Build a structured quote — it takes about a minute.</CardSubtitle>
              <Link className="mt-4 inline-block" href="/dashboard/projects/new">
                <Button variant="accent">
                  <Plus className="h-4 w-4" /> Create project
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
                className="surface flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{p.title}</span>
                    <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {p.code} · client: {p.clientContact?.name ?? p.clientContact?.email ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
