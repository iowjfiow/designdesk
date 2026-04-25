"use client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      Sign out
    </button>
  );
}
