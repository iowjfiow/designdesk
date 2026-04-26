import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardNav } from "@/components/DashboardNav";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-border bg-card/30 p-4 lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2 text-base font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            DesignDesk
          </Link>
          <DashboardNav unread={unread} inboxCount={inboxCount} />
          <div className="mt-auto rounded-xl border border-border bg-card p-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full accent-gradient text-sm font-semibold text-white shadow-sm">
                {(me.name ?? me.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{me.name ?? me.email}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{me.role.replace("_", " ").toLowerCase()}</div>
              </div>
            </div>
            <SignOutButton />
          </div>
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="flex items-center gap-3 border-b border-border bg-card/40 px-6 py-3 lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block h-5 w-5 rounded-md accent-gradient" />
              DesignDesk
            </Link>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> {unread} new
            </span>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
