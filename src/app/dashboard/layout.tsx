import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { LayoutDashboard, Briefcase, Wallet, Bell } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <aside className="border-r border-border p-4">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-base font-semibold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          DesignDesk
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Overview</NavLink>
          <NavLink href="/dashboard/projects" icon={<Briefcase className="h-4 w-4" />}>Projects</NavLink>
          <NavLink href="/dashboard/wallet" icon={<Wallet className="h-4 w-4" />}>Wallet</NavLink>
          <NavLink href="/dashboard/notifications" icon={<Bell className="h-4 w-4" />}>Notifications</NavLink>
        </nav>
        <div className="mt-8 rounded-lg bg-muted p-3 text-xs">
          <div className="font-medium">{me.name ?? me.email}</div>
          <div className="text-muted-foreground">{me.role}</div>
          <SignOutButton />
        </div>
      </aside>
      <main className="px-8 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
