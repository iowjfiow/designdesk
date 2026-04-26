"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-3 w-3" />
        Sign out
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogOut className="h-3 w-3" />
      Sign out
    </button>
  );
}
