import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { Bell, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [unread, inboxCount] = await Promise.all([
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
    ["DESIGNER", "CLIENT_MANAGER", "ADMIN"].includes(me.role)
      ? prisma.project.count({ where: { status: "INCOMING" } })
      : Promise.resolve(0),
  ]);

  const initial = (me.name ?? me.email).slice(0, 1).toUpperCase();
  const role = me.role.replaceAll("_", " ").toLowerCase();

  return (
    <div className="theme-dashboard min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-border bg-[rgb(14_14_19)]/95 lg:flex lg:flex-col">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5 text-base font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>DesignDesk</span>
            <span className="text-foreground/40">.</span>
          </Link>
          <DashboardSidebar unread={unread} inboxCount={inboxCount} />
          <div className="mt-4 px-3">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg accent-gradient text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold">Upgrade to Pro</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Unlock advanced features and boost your productivity.
              </div>
              <button className="mt-3 w-full rounded-lg accent-gradient px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 hover:opacity-95">
                Upgrade Now
              </button>
            </div>
          </div>
          <div className="mt-auto border-t border-border px-3 py-3">
            <Link
              href="https://docs.devin.ai"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <span className="text-xs">?</span>
              </span>
              Help &amp; Support
              <span className="ml-auto text-muted-foreground">›</span>
            </Link>
          </div>
        </aside>
        <div className="flex min-h-screen flex-col">
          {/* Mobile-only header */}
          <header className="flex items-center gap-3 border-b border-border bg-card/50 px-5 py-3 lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md accent-gradient text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              DesignDesk
            </Link>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> {unread}
            </span>
          </header>
          {/* Desktop top bar */}
          <DashboardTopBar
            name={me.name ?? me.email}
            role={role}
            initial={initial}
            unread={unread}
            signOut={<SignOutButton compact />}
          />
          <main className="flex-1 px-5 pb-10 pt-4 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
