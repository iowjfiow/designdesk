"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Inbox,
  Bell,
  Wallet,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; key: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/dashboard/projects", label: "Projects", icon: Briefcase, key: "projects" },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, key: "inbox" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, key: "clients" },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet, key: "wallet" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, key: "reports" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, key: "notifications" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, key: "settings" },
];

export function DashboardSidebar({ unread, inboxCount }: { unread: number; inboxCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2 text-sm">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const badge =
          item.key === "inbox" && inboxCount > 0
            ? inboxCount
            : item.key === "notifications" && unread > 0
              ? unread
              : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              active
                ? "bg-accent/15 text-foreground shadow-[inset_2px_0_0_rgb(var(--accent))]"
                : "text-foreground/65 hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-foreground/50 group-hover:text-foreground/80"}`} />
            <span className="flex-1">{item.label}</span>
            {badge != null ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"}`}>
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
