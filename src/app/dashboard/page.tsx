import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";

export default async function DashboardOverview() {
  const me = await requireUser();
  const [projects, wallet, unread] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ designerId: me.id }, { managerId: me.id }, { clientId: me.id }] },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { order: true },
    }),
    prisma.walletEntry.findMany({ where: { userId: me.id } }),
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);

  const summary = wallet.reduce(
    (a, e) => {
      if (e.state === "available") a.available += e.amountMinor;
      else if (e.state === "pending") a.pending += e.amountMinor;
      return a;
    },
    { available: 0, pending: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {me.name ?? me.email}</h1>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium">{me.role}</span> · {unread} unread notifications
          </p>
        </div>
        <Link href="/dashboard/projects/new"><Button variant="accent">New project</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardSubtitle>Available balance</CardSubtitle>
          <CardTitle className="mt-1">{formatMoney(summary.available, "INR")}</CardTitle>
        </Card>
        <Card>
          <CardSubtitle>Pending</CardSubtitle>
          <CardTitle className="mt-1">{formatMoney(summary.pending, "INR")}</CardTitle>
        </Card>
        <Card>
          <CardSubtitle>Active projects</CardSubtitle>
          <CardTitle className="mt-1">
            {projects.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status)).length}
          </CardTitle>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent projects</h2>
          <Link className="text-sm text-accent" href="/dashboard/projects">View all →</Link>
        </div>
        {projects.length === 0 ? (
          <Card>
            <CardSubtitle>No projects yet. Start your first one.</CardSubtitle>
            <Link className="mt-3 inline-block" href="/dashboard/projects/new"><Button>Create project</Button></Link>
          </Card>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="surface flex items-center justify-between p-4 hover:bg-muted/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                    <Badge variant="default">{p.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.code}</div>
                </div>
                <div className="text-right text-sm">
                  {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
