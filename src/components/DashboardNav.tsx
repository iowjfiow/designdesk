"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, Inbox, LayoutDashboard, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

export function DashboardNav({ unread, inboxCount = 0 }: { unread: number; inboxCount?: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview", exact: true },
    { href: "/dashboard/inbox", icon: <Inbox className="h-4 w-4" />, label: "Inbox", badge: inboxCount, badgeTone: "accent" as const },
    { href: "/dashboard/projects", icon: <Briefcase className="h-4 w-4" />, label: "Projects" },
    { href: "/dashboard/wallet", icon: <Wallet className="h-4 w-4" />, label: "Wallet" },
    { href: "/dashboard/notifications", icon: <Bell className="h-4 w-4" />, label: "Notifications", badge: unread, badgeTone: "danger" as const },
  ];
  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
              active
                ? "bg-accent/10 text-accent"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <span className={cn(active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  item.badgeTone === "accent"
                    ? "bg-accent/15 text-accent"
                    : "bg-danger/15 text-danger",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
