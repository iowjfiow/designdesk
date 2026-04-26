import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardNav } from "@/components/DashboardNav";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: me.id, readAt: null } });

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-border bg-card/40 p-4 lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-base font-semibold tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md accent-gradient shadow-sm" />
            DesignDesk
          </Link>
          <DashboardNav unread={unread} />
          <div className="mt-auto rounded-xl border border-border bg-card p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full accent-gradient text-xs font-medium text-white">
                {(me.name ?? me.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{me.name ?? me.email}</div>
                <div className="text-muted-foreground">{me.role}</div>
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
