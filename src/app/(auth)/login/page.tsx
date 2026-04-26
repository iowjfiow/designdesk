"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Field, Label } from "@/components/ui/Input";
import { ArrowRight, KeyRound, ShieldCheck, UserRound, Wand2 } from "lucide-react";

const DEMO_PASS = "password123";
const DEMO_ACCOUNTS = [
  { email: "designer@example.com", role: "Designer", desc: "Creates projects, submits work", icon: <Wand2 className="h-4 w-4" /> },
  { email: "manager@example.com", role: "Client Manager", desc: "Brings clients, co-approves scope", icon: <UserRound className="h-4 w-4" /> },
  { email: "admin@example.com", role: "Admin", desc: "Resolves disputes, oversight", icon: <ShieldCheck className="h-4 w-4" /> },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(email: string) {
    setForm({ email, password: DEMO_PASS });
  }

  return (
    <main className="relative min-h-screen bg-grid">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="hidden lg:block">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md accent-gradient" />
            DesignDesk
          </Link>
          <h1 className="mt-10 text-balance text-4xl font-semibold tracking-tight">
            Welcome back. <span className="gradient-text">Let&apos;s ship something.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Demo accounts below — sign in and a parallel session in a second browser to see the
            mutual-approval flow live. Clients themselves don&apos;t need an account.
          </p>

          <div className="mt-8 surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Demo accounts</span>
              <span className="ml-auto chip">password: {DEMO_PASS}</span>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  type="button"
                  key={a.email}
                  onClick={() => fillDemo(a.email)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                    {a.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{a.email}</span>
                    <span className="block text-xs text-muted-foreground">
                      {a.role} · {a.desc}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Click any to autofill. Clients are magic-link only — they appear in projects via an
              emailed link, no account.
            </p>
          </div>
        </div>

        <div className="surface-elevated p-8">
          <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-semibold lg:hidden">
            <span className="inline-block h-5 w-5 rounded-md accent-gradient" />
            DesignDesk
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use any demo account or your own credentials.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            {error ? (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" variant="accent" size="lg" loading={loading}>
              Log in
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <hr className="flex-1 border-border" />
            <span>or</span>
            <hr className="flex-1 border-border" />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:hidden">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="rounded-lg border border-border p-2 text-center text-xs hover:border-accent/40 hover:bg-accent/5"
              >
                {a.role}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
