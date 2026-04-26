import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  GitFork,
  Hash,
  KeyRound,
  Lock,
  Receipt,
  Shield,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="bg-grid">
        <div className="mx-auto max-w-6xl px-6">
          <Header />

          {/* HERO */}
          <section className="bg-aurora relative grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="relative">
              <div className="chip chip-accent">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Live · Phase 1.5 shipped
              </div>
              <h1 className="mt-6 text-balance text-[3.25rem] font-semibold leading-[0.98] tracking-tight sm:text-[5.5rem]">
                Design work
                <br />
                <span className="gradient-text">that actually pays.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                The freelance OS for designers and the partners who bring them clients. Structured
                pricing, mutual scope approval, real escrow, milestone releases — the whole engagement
                in one place, built so nobody gets burned.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/order">
                  <Button size="lg" variant="accent" className="shadow-lg shadow-indigo-500/20">
                    Place an order <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline">
                    I&apos;m a designer
                  </Button>
                </Link>
                <Link href="/login" className="hidden self-center text-sm text-muted-foreground hover:text-foreground sm:inline">
                  or open the demo →
                </Link>
              </div>
              <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                {[
                  ["No client signup", "Magic-link only"],
                  ["Mutual scope lock", "Both sides approve"],
                  ["Real escrow", "Stripe Connect held"],
                  ["Tamper-evident", "Hash-chained chat"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <div>
                      <span className="font-medium text-foreground">{k}.</span> {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock dashboard preview */}
            <div className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-mesh blur-2xl" />
              <div className="surface-elevated overflow-hidden rounded-2xl">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <div className="ml-3 truncate text-xs text-muted-foreground">
                    designdesk.app/dashboard/projects/DD-9F2A
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5">
                  <PreviewStat label="Escrow" value="₹49,500" tone="accent" />
                  <PreviewStat label="Released" value="₹14,850" tone="success" />
                  <PreviewStat label="Pending" value="3 m/stones" />
                </div>
                <div className="border-t border-border px-5 py-4">
                  <div className="eyebrow">Mutual approval</div>
                  <div className="mt-3 space-y-2">
                    <PreviewApproval label="Designer" approved />
                    <PreviewApproval label="Client manager" approved />
                    <PreviewApproval label="Scope locked" approved final />
                  </div>
                </div>
                <div className="border-t border-border px-5 py-4">
                  <div className="eyebrow">Milestones</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <PreviewMilestone title="Concept" amount="₹14,850" status="approved" />
                    <PreviewMilestone title="Revision" amount="₹14,850" status="submitted" />
                    <PreviewMilestone title="Final" amount="₹19,800" status="pending" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TRUST STRIP */}
          <section className="-mt-6 mb-16 overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-6 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="hidden sm:inline">Built on</span>
              <div className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:justify-start">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Stripe Connect</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Razorpay Route</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Next.js 14</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Postgres</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Tamper-evident audit</span>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS — bento style */}
          <section id="how" className="py-12">
            <div className="mb-10 max-w-2xl">
              <div className="eyebrow">How it works</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Quote → approve → escrow → ship.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Every step logged. Every total structured. Every payment held until the client signs off.
                No hidden side-deals. No verbal scope changes.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
              <BentoCard
                className="lg:col-span-7 lg:row-span-1"
                step="01"
                title="Build the structured quote"
                body="Pick a base package and add-ons grouped by category. Live total updates with tax. Override with a custom quote when you need to."
                visual={
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MiniRow label="Logo · Standard" value="₹2,499" />
                    <MiniRow label="Brand kit" value="+₹3,500" />
                    <MiniRow label="Source files" value="+₹999" />
                    <MiniRow label="Mockups (5)" value="+₹1,499" />
                    <MiniRow label="Subtotal" value="₹8,497" />
                    <MiniRow label="Total (18% GST)" value="₹10,026" highlight />
                  </div>
                }
              />
              <BentoCard
                className="lg:col-span-5 lg:row-span-1"
                step="02"
                title="Both sides approve"
                body="Designer + Client Manager each click approve. Until both, scope can still change."
                visual={
                  <div className="space-y-2 text-sm">
                    <PreviewApproval label="Designer" approved />
                    <PreviewApproval label="Client manager" approved />
                    <PreviewApproval label="Scope locked" approved final />
                  </div>
                }
              />
              <BentoCard
                className="lg:col-span-5 lg:row-span-1"
                step="03"
                title="Client funds escrow"
                body="The client gets a magic-link, no signup. They pay into platform escrow."
                visual={
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Escrow held</div>
                    <div className="mt-1 text-2xl font-semibold">₹49,500</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Funds locked
                    </div>
                  </div>
                }
              />
              <BentoCard
                className="lg:col-span-7 lg:row-span-1"
                step="04"
                title="Release per milestone"
                body="30/30/40 default. Each approval releases the share — split per BPS in collaboration."
                visual={
                  <div className="space-y-2 text-sm">
                    <PreviewMilestone title="Concept (30%)" amount="₹14,850" status="approved" />
                    <PreviewMilestone title="Revision (30%)" amount="₹14,850" status="submitted" />
                    <PreviewMilestone title="Final (40%)" amount="₹19,800" status="pending" />
                  </div>
                }
              />
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="py-16">
            <div className="mb-10 max-w-2xl">
              <div className="eyebrow">What&apos;s inside</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                A full freelance OS — not a chat with attachments.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <Users className="h-5 w-5" />, title: "Dual-mode", body: "Solo or with a Client Manager — switch with one toggle. Each project is tagged.", tone: "indigo" },
                { icon: <KeyRound className="h-5 w-5" />, title: "Magic-link clients", body: "Clients never sign up. They get a private link with full approval rights.", tone: "violet" },
                { icon: <Lock className="h-5 w-5" />, title: "Mutual scope lock", body: "Both designer and manager must approve. After lock, scope is frozen.", tone: "indigo" },
                { icon: <Wallet className="h-5 w-5" />, title: "Real escrow", body: "Stripe Connect holds funds; releases per milestone, splits per agreed BPS.", tone: "violet" },
                { icon: <Hash className="h-5 w-5" />, title: "Tamper-evident", body: "Hash-chained chat, immutable activity log, signed webhooks.", tone: "indigo" },
                { icon: <Shield className="h-5 w-5" />, title: "Anti-scam by design", body: "No work without a system order. No payment outside the platform.", tone: "violet" },
                { icon: <Receipt className="h-5 w-5" />, title: "Structured pricing", body: "Base packages + add-ons grouped by category, taxes, live total, locked at confirmation.", tone: "indigo" },
                { icon: <GitFork className="h-5 w-5" />, title: "Milestone releases", body: "30/30/40 default. Approve to release the corresponding share.", tone: "violet" },
                { icon: <Star className="h-5 w-5" />, title: "Per-milestone reviews", body: "Clients leave detailed feedback as work lands, plus a final 1–5 star review.", tone: "indigo" },
              ].map((f) => (
                <div key={f.title} className="surface card-glow group relative overflow-hidden p-6">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
                  <div className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                    {f.icon}
                  </div>
                  <div className="relative text-base font-semibold tracking-tight">{f.title}</div>
                  <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* TESTIMONIAL/STATS */}
          <section className="grid gap-6 py-16 lg:grid-cols-3">
            <BigStat number="0" suffix="%" label="Of work outside the platform" body="No verbal scope. No DM-only handshake. Everything is logged." />
            <BigStat number="100" suffix="%" label="Of payments held in escrow" body="Released only when the client approves a milestone." accent />
            <BigStat number="3" label="Default milestone splits" body="30 / 30 / 40 — the way most freelance jobs really pay out." />
          </section>

          {/* CTA */}
          <section id="trust" className="surface-elevated bg-mesh relative my-16 overflow-hidden rounded-3xl p-10 sm:p-16">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full accent-gradient opacity-30 blur-3xl" />
            <div className="absolute -left-32 -bottom-32 h-72 w-72 rounded-full bg-pink-400/30 opacity-30 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="eyebrow">Open access</div>
                <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                  Ship with us. Demo accounts already signed up.
                </h2>
                <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                  Open two browsers side-by-side. Sign in as the designer in one and the client manager
                  in another to see the mutual-approval flow live. Then place an order at <code className="rounded bg-muted/50 px-1.5 py-0.5 text-foreground">/order</code> in
                  incognito to play the client side — no signup needed.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href="/login">
                    <Button size="lg" variant="accent">Open the demo <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                  <Link href="/order">
                    <Button size="lg" variant="outline">
                      Place an order <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-2 lg:justify-self-end">
                <DemoChip email="designer@example.com" role="Designer" />
                <DemoChip email="manager@example.com" role="Client Manager" />
                <DemoChip email="admin@example.com" role="Admin" />
                <p className="pt-2 text-xs text-muted-foreground">password: <code className="rounded bg-muted/50 px-1 py-0.5">password123</code></p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col items-start justify-between gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm accent-gradient" />
              DesignDesk · Built for freelancers who refuse to get burned.
            </div>
            <div className="flex gap-4">
              <Link href="/order" className="hover:text-foreground">Place order</Link>
              <Link href="/signup" className="hover:text-foreground">Sign up</Link>
              <Link href="/login" className="hover:text-foreground">Log in</Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 -mx-6 mb-2 flex items-center justify-between bg-background/70 px-6 py-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        DesignDesk
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
        <a href="#how" className="hover:text-foreground">How it works</a>
        <a href="#features" className="hover:text-foreground">Features</a>
        <a href="#trust" className="hover:text-foreground">Trust</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/order" className="hidden sm:block">
          <Button variant="ghost" size="sm">Place an order</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="sm">Log in</Button>
        </Link>
        <Link href="/signup">
          <Button variant="accent" size="sm">Get started <ArrowRight className="h-3.5 w-3.5" /></Button>
        </Link>
      </div>
    </header>
  );
}

function BentoCard({
  className = "",
  step,
  title,
  body,
  visual,
}: {
  className?: string;
  step: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div
      className={`surface card-glow relative overflow-hidden rounded-2xl p-6 ${className}`}
    >
      <div className="absolute right-4 top-4 text-[10rem] font-bold leading-none tracking-tighter text-accent/5 select-none pointer-events-none">
        {step}
      </div>
      <div className="relative">
        <span className="step-num">{step.replace(/^0/, "")}</span>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-4">{visual}</div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
        highlight ? "bg-accent/10 font-semibold text-accent" : "border border-border bg-card"
      }`}
    >
      <span className={highlight ? "" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "" : "text-foreground"}>{value}</span>
    </div>
  );
}

function BigStat({
  number,
  suffix,
  label,
  body,
  accent,
}: {
  number: string;
  suffix?: string;
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border p-7 ${accent ? "bg-mesh" : "bg-card"}`}>
      <div className={`flex items-baseline gap-1 text-7xl font-semibold tracking-tight ${accent ? "gradient-text" : ""}`}>
        {number}
        {suffix ? <span className="text-3xl">{suffix}</span> : null}
      </div>
      <div className="mt-3 text-sm font-semibold tracking-tight">{label}</div>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function DemoChip({ email, role }: { email: string; role: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/80 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full accent-gradient text-xs font-semibold text-white">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="font-mono text-xs">{email}</span>
      </div>
      <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
        {role}
      </span>
    </div>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "accent" }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-base font-semibold tracking-tight ${
          tone === "success" ? "text-success" : tone === "accent" ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PreviewApproval({ label, approved, final }: { label: string; approved: boolean; final?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          approved
            ? final
              ? "accent-gradient text-white"
              : "bg-success/15 text-success"
            : "border border-border"
        }`}
      >
        {approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </span>
      <span className={final ? "font-medium" : ""}>{label}</span>
    </div>
  );
}

function PreviewMilestone({
  title,
  amount,
  status,
}: {
  title: string;
  amount: string;
  status: "approved" | "submitted" | "pending";
}) {
  const tone =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "submitted"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  const label = status === "approved" ? "approved" : status === "submitted" ? "submitted" : "pending";
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
      <span className="text-foreground">{title}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{amount}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
      </div>
    </div>
  );
}
