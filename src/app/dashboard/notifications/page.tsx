import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";
import {
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Briefcase,
  Settings as SettingsIcon,
  AlertTriangle,
  Sparkles,
  MessageSquare,
} from "lucide-react";

type Tab = "all" | "unread" | "projects" | "payments" | "system";

function categorize(title: string, body: string): "project" | "payment" | "system" {
  const s = `${title} ${body}`.toLowerCase();
  if (/(payment|escrow|paid|payout|wallet|invoice|release|refund)/.test(s)) return "payment";
  if (/(system|update|maintenance|policy)/.test(s)) return "system";
  return "project";
}

function iconFor(cat: "project" | "payment" | "system", title: string, body: string) {
  const s = `${title} ${body}`.toLowerCase();
  if (cat === "payment") return { tone: "bg-emerald-500/15 text-emerald-300", node: <CircleDollarSign className="h-4 w-4" /> };
  if (cat === "system") return { tone: "bg-sky-500/15 text-sky-300", node: <SettingsIcon className="h-4 w-4" /> };
  if (/(dispute|reject)/.test(s)) return { tone: "bg-rose-500/15 text-rose-300", node: <AlertTriangle className="h-4 w-4" /> };
  if (/(approve|complete|release)/.test(s)) return { tone: "bg-emerald-500/15 text-emerald-300", node: <CheckCircle2 className="h-4 w-4" /> };
  if (/(message|chat)/.test(s)) return { tone: "bg-indigo-500/15 text-indigo-300", node: <MessageSquare className="h-4 w-4" /> };
  if (/(deliverable|upload|brief|scope|claim)/.test(s)) return { tone: "bg-violet-500/15 text-violet-300", node: <Briefcase className="h-4 w-4" /> };
  return { tone: "bg-indigo-500/15 text-indigo-300", node: <Sparkles className="h-4 w-4" /> };
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

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const tab: Tab = (["all", "unread", "projects", "payments", "system"].includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "all");

  const list = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const counts = list.reduce(
    (acc, n) => {
      acc.all += 1;
      if (!n.readAt) acc.unread += 1;
      const cat = categorize(n.title, n.body);
      if (cat === "project") acc.projects += 1;
      else if (cat === "payment") acc.payments += 1;
      else acc.system += 1;
      return acc;
    },
    { all: 0, unread: 0, projects: 0, payments: 0, system: 0 },
  );

  const filtered = list.filter((n) => {
    if (tab === "all") return true;
    if (tab === "unread") return !n.readAt;
    const cat = categorize(n.title, n.body);
    if (tab === "projects") return cat === "project";
    if (tab === "payments") return cat === "payment";
    if (tab === "system") return cat === "system";
    return true;
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "projects", label: "Projects", count: counts.projects },
    { key: "payments", label: "Payments", count: counts.payments },
    { key: "system", label: "System", count: counts.system },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <Link
                  key={t.key}
                  href={`/dashboard/notifications?tab=${t.key}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-accent/15 text-foreground" : "text-foreground/70 hover:bg-muted"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <MarkAllReadButton />
            <Link href="/dashboard/settings">
              <Button size="sm" variant="outline">
                <SettingsIcon className="h-3.5 w-3.5" />
                Notification Settings
              </Button>
            </Link>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Bell className="h-5 w-5" />
            </span>
            <div className="text-base font-semibold">You&rsquo;re all caught up</div>
            <div className="mt-1 text-sm text-muted-foreground">No notifications in this view.</div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((n) => {
              const cat = categorize(n.title, n.body);
              const i = iconFor(cat, n.title, n.body);
              const Wrap = (n.href ? Link : "div") as React.ElementType;
              const wrapProps = n.href ? { href: n.href } : {};
              return (
                <li key={n.id}>
                  <Wrap
                    {...wrapProps}
                    className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <span className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl ${i.tone}`}>
                      {i.node}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                    </div>
                    <div className="ml-2 flex flex-none items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{relTime(n.createdAt)}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`}
                        aria-hidden
                      />
                    </div>
                  </Wrap>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
