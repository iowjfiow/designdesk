"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field, Label } from "@/components/ui/Input";
import { CheckCircle2, Sparkles, UserRound, Wand2 } from "lucide-react";

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
    <main className="relative min-h-screen bg-grid">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="hidden lg:block">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md accent-gradient" />
            DesignDesk
          </Link>
          <h1 className="mt-10 text-balance text-4xl font-semibold tracking-tight">
            Start a freelance practice <span className="gradient-text">that pays.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Spin up structured quotes in seconds. Lock scope after both sides approve. Hold funds
            in escrow. Release per milestone.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {[
              "Free to start — no credit card",
              "Stripe Connect onboarding when you&apos;re ready",
              "Solo or with a partner — switch any time",
              "Clients access projects via magic-link, no signup required",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span dangerouslySetInnerHTML={{ __html: t }} />
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-elevated p-8">
          <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-semibold lg:hidden">
            <span className="inline-block h-5 w-5 rounded-md accent-gradient" />
            DesignDesk
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-accent">
              Create your account
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Let&apos;s get you set up
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Designers and Client Managers sign up here. Clients don&apos;t need an account.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <RoleCard
              active={form.role === "DESIGNER"}
              icon={<Wand2 className="h-4 w-4" />}
              title="Designer"
              desc="You build & ship."
              onClick={() => setForm({ ...form, role: "DESIGNER" })}
            />
            <RoleCard
              active={form.role === "CLIENT_MANAGER"}
              icon={<UserRound className="h-4 w-4" />}
              title="Client Manager"
              desc="You bring clients."
              onClick={() => setForm({ ...form, role: "CLIENT_MANAGER" })}
            />
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field>
              <Label htmlFor="password">Password (min 8 chars)</Label>
              <Input id="password" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            <input type="hidden" value={form.role} />
            {/* Hidden role select for accessibility fallback */}
            <Select className="hidden" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option value="DESIGNER">Designer</option>
              <option value="CLIENT_MANAGER">Client Manager</option>
            </Select>

            {error ? (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" variant="accent" size="lg" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function RoleCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all ${
        active
          ? "border-accent/40 bg-accent/5 shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
          : "border-border hover:border-border-strong hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            active ? "accent-gradient text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </span>
        {active ? <CheckCircle2 className="h-4 w-4 text-accent" /> : null}
      </div>
      <div className="mt-2 text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
