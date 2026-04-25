"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "DESIGNER" as "DESIGNER" | "CLIENT_MANAGER",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Signup failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Designers create projects and deliver work. Client Managers bring in clients and approve scopes. Clients themselves don&apos;t need an account — they receive a private link by email.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Full name</span>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Email</span>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Password (min 8 chars)</span>
            <Input type="password" value={form.password} minLength={8} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Primary role</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="DESIGNER">Designer (creator)</option>
              <option value="CLIENT_MANAGER">Client Manager (collaboration partner)</option>
            </select>
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" variant="accent" size="lg" loading={loading}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent">Log in</Link>
        </p>
      </div>
    </main>
  );
}
