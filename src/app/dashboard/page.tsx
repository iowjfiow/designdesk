import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { StatusPill, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { ArrowRight, ArrowUpRight, Briefcase, Inbox, Plus, Wallet, Clock, Sparkles, Star, Hand } from "lucide-react";

export default async function DashboardOverview() {
  const me = await requireUser();
  const [projects, wallet, unread, inboxCount] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ designerId: me.id }, { managerId: me.id }] },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { order: true, clientContact: true },
    }),
    prisma.walletEntry.findMany({ where: { userId: me.id } }),
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
    prisma.project.count({ where: { status: "INCOMING" } }),
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
  const firstName = me.name?.split(" ")[0] ?? me.email.split("@")[0];

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-mesh px-7 py-9 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-32 -top-24 h-72 w-72 rounded-full accent-gradient opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-pink-400/30 opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="chip chip-accent">
              <Sparkles className="h-3 w-3" /> {me.role.replaceAll("_", " ")}
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Hey, <span className="gradient-text">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              {activeCount > 0
                ? `${activeCount} active project${activeCount === 1 ? "" : "s"} in motion${
                    inboxCount > 0 ? ` and ${inboxCount} new order${inboxCount === 1 ? "" : "s"} waiting in your inbox.` : "."
                  }`
                : inboxCount > 0
                  ? `${inboxCount} new order${inboxCount === 1 ? "" : "s"} waiting in your inbox.`
                  : "Nothing on the burner. Build a structured quote in about a minute."}
              {unread > 0 ? (
                <> · <span className="text-warning">{unread} unread alert{unread === 1 ? "" : "s"}</span></>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {inboxCount > 0 ? (
              <Link href="/dashboard/inbox">
                <Button variant="outline" size="lg" className="bg-card/70 backdrop-blur-sm">
                  <Inbox className="h-4 w-4" />
                  Inbox <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{inboxCount}</span>
                </Button>
              </Link>
            ) : null}
            <Link href="/dashboard/projects/new">
              <Button variant="accent" size="lg" className="shadow-lg shadow-indigo-500/30">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat
            icon={<Wallet className="h-4 w-4" />}
            label="Available"
            value={formatMoney(summary.available, "INR")}
            hint="Ready to withdraw"
            tone="success"
          />
          <HeroStat
            icon={<Clock className="h-4 w-4" />}
            label="In escrow"
            value={formatMoney(summary.locked, "INR")}
            hint="Locked until approved"
            tone="accent"
          />
          <HeroStat
            icon={<Star className="h-4 w-4" />}
            label="Pending"
            value={formatMoney(summary.pending, "INR")}
            hint="Approved, settling"
          />
          <HeroStat
            icon={<Briefcase className="h-4 w-4" />}
            label="Active"
            value={String(activeCount)}
            hint={`${projects.length} total in view`}
          />
        </div>
      </section>

      {/* RECENT */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow">Activity</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Recent projects</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-sm text-accent hover:underline" href="/dashboard/projects">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <Card className="bg-mesh">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient text-white shadow-lg shadow-indigo-500/30">
                <Briefcase className="h-6 w-6" />
              </div>
              <CardTitle>Spin up your first project</CardTitle>
              <CardSubtitle className="mt-1 max-w-sm">
                Build a structured quote in under a minute. Pick a base package, add formats and extras,
                lock the scope, get paid.
              </CardSubtitle>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/dashboard/projects/new">
                  <Button variant="accent">
                    <Plus className="h-4 w-4" /> Create project
                  </Button>
                </Link>
                <Link href="/dashboard/inbox">
                  <Button variant="outline">
                    <Hand className="h-4 w-4" /> Claim from inbox
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.id}`}
                className="surface card-glow group flex items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold">{p.title}</span>
                    <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="font-mono">{p.code}</span> · client: {p.clientContact?.name ?? p.clientContact?.email ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold tracking-tight">
                    {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent sm:block" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "accent" | "success";
}) {
  const ringTone =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "accent"
        ? "border-accent/30 bg-accent/10 text-accent"
        : "border-border bg-muted/50 text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${ringTone}`}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
