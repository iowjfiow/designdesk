"use client";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import Link from "next/link";

const TITLES: { match: (p: string) => boolean; title: string; subtitle: string }[] = [
  { match: (p) => p === "/dashboard", title: "Dashboard", subtitle: "Welcome back, here's what's happening with your projects." },
  { match: (p) => p.startsWith("/dashboard/projects/new"), title: "New project", subtitle: "Build a structured quote and lock the scope." },
  { match: (p) => p.startsWith("/dashboard/projects"), title: "Projects", subtitle: "Manage every project in one place." },
  { match: (p) => p.startsWith("/dashboard/inbox"), title: "Inbox", subtitle: "Public orders waiting to be claimed." },
  { match: (p) => p.startsWith("/dashboard/wallet"), title: "Wallet", subtitle: "Track escrow, available, and pending balances." },
  { match: (p) => p.startsWith("/dashboard/notifications"), title: "Notifications", subtitle: "Stay updated with everything that matters." },
  { match: (p) => p.startsWith("/dashboard/reports"), title: "Reports", subtitle: "Track your performance and analyze your work." },
  { match: (p) => p.startsWith("/dashboard/clients"), title: "Clients", subtitle: "Everyone you've worked with." },
  { match: (p) => p.startsWith("/dashboard/settings"), title: "Settings", subtitle: "Manage your profile and account." },
];

export function DashboardTopBar({
  name,
  role,
  initial,
  unread,
  signOut,
}: {
  name: string;
  role: string;
  initial: string;
  unread: number;
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const meta = TITLES.find((t) => t.match(pathname)) ?? TITLES[0];
  return (
    <header className="hidden items-center gap-4 border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md lg:flex">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
      </div>
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search projects, clients..."
          className="h-10 w-full rounded-xl border border-border bg-card/60 pl-9 pr-12 text-sm placeholder:text-muted-foreground/60 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <Link
        href="/dashboard/notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground/70 hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
        ) : null}
      </Link>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-2.5 py-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full accent-gradient text-xs font-semibold text-white">
          {initial}
        </span>
        <div className="hidden text-right xl:block">
          <div className="text-sm font-medium leading-none">{name}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{role}</div>
        </div>
      </div>
      {signOut}
    </header>
  );
}
