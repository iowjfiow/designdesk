import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
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
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="bg-grid">
        <div className="mx-auto max-w-6xl px-6">
          <header className="flex items-center justify-between py-6">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <span className="inline-block h-7 w-7 rounded-lg accent-gradient shadow-sm" />
              DesignDesk
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
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
                <Button variant="accent" size="sm">Get started</Button>
              </Link>
            </div>
          </header>

          <section className="bg-aurora grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <div className="chip chip-accent">
                <Sparkles className="h-3 w-3" />
                Trusted freelance ops, end-to-end
              </div>
              <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
                Run design work,{" "}
                <span className="gradient-text">without getting burned.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Structured pricing, mutual scope approval, escrowed payments and milestone releases.
                Solo or with a partner who brings clients — one platform for the whole engagement.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/order">
                  <Button size="lg" variant="accent">
                    Place an order <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline">
                    I&apos;m a designer
                  </Button>
                </Link>
              </div>
              <ul className="mt-10 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {[
                  "No client signup — magic-link only",
                  "Both sides approve before scope locks",
                  "Escrow held until milestones land",
                  "Tamper-evident, hash-chained chat",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock dashboard preview */}
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl accent-gradient opacity-20 blur-3xl" />
              <div className="surface-elevated overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <div className="ml-3 truncate text-xs text-muted-foreground">
                    designdesk.app/dashboard/projects/DD-9F2A
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 p-5">
                  <PreviewStat label="Escrow" value="₹49,500" />
                  <PreviewStat label="Released" value="₹14,850" tone="success" />
                  <PreviewStat label="Pending" value="3 milestones" tone="accent" />
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

          <section id="how" className="py-16">
            <div className="mb-10 max-w-2xl">
              <div className="eyebrow">How it works</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Quote → approve → escrow → ship.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every step is logged, every total is structured, every payment is held until the
                client signs off. No hidden side-deals. No verbal scope changes.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  title: "Build the quote",
                  body: "Pick a base package and add-ons. Live total updates with tax. Custom quotes for outliers.",
                },
                {
                  n: "02",
                  title: "Both sides approve",
                  body: "Designer and Client Manager each approve. Until both, the scope can still change.",
                },
                {
                  n: "03",
                  title: "Client funds escrow",
                  body: "The client gets a magic-link, no signup. They pay into platform escrow.",
                },
                {
                  n: "04",
                  title: "Release per milestone",
                  body: "30/30/40 by default. Each approval releases the share — split per BPS in collab.",
                },
              ].map((s) => (
                <div key={s.n} className="surface card-glow p-5">
                  <span className="step-num">{s.n.replace(/^0/, "")}</span>
                  <div className="mt-3 text-sm font-semibold tracking-tight">{s.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="features" className="py-12">
            <div className="mb-10 max-w-2xl">
              <div className="eyebrow">What&apos;s inside</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                A full freelance OS — not just a chat with attachments.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <Users className="h-5 w-5" />, title: "Dual-mode", body: "Solo or with a Client Manager — switch with one toggle. Each project is tagged." },
                { icon: <KeyRound className="h-5 w-5" />, title: "Magic-link clients", body: "Clients never sign up. They get a private link with full approval rights." },
                { icon: <Lock className="h-5 w-5" />, title: "Mutual scope lock", body: "Both designer and manager must approve. After lock, scope is frozen." },
                { icon: <Wallet className="h-5 w-5" />, title: "Real escrow", body: "Stripe Connect holds funds; releases per milestone, splits per agreed BPS." },
                { icon: <Hash className="h-5 w-5" />, title: "Tamper-evident", body: "Hash-chained chat, immutable activity log, signed webhooks." },
                { icon: <Shield className="h-5 w-5" />, title: "Anti-scam by design", body: "No work without a system order. No payment outside the platform." },
                { icon: <Receipt className="h-5 w-5" />, title: "Structured pricing", body: "Base packages + add-ons grouped by category, taxes, live total, locked at confirmation." },
                { icon: <GitFork className="h-5 w-5" />, title: "Milestone releases", body: "30 / 30 / 40 default. Approve to release the corresponding share." },
                { icon: <Star className="h-5 w-5" />, title: "Per-milestone reviews", body: "Clients leave detailed feedback as work lands, plus a final 1–5 star review." },
              ].map((f) => (
                <div key={f.title} className="surface card-glow p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    {f.icon}
                  </div>
                  <div className="text-sm font-semibold tracking-tight">{f.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="trust" className="surface-elevated relative my-12 overflow-hidden p-8 sm:p-12">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full accent-gradient opacity-15 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full accent-gradient opacity-10 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="eyebrow">Try it before you commit</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Demo accounts already signed up.
                </h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Open two browsers side-by-side. Sign in as the designer in one and the client manager
                  in another to see the mutual-approval flow live. Then place an order at <code className="text-foreground">/order</code> in
                  incognito to play the client side — no signup needed.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link href="/login">
                  <Button size="lg" variant="accent">
                    Open the demo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/order" className="text-sm text-muted-foreground hover:text-foreground">
                  Or try placing an order →
                </Link>
              </div>
            </div>
          </section>

          <footer className="flex flex-col items-start justify-between gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm accent-gradient" />
              DesignDesk · Built for freelancers who refuse to get burned.
            </div>
            <div className="flex gap-4">
              <span>Stripe Connect (test mode)</span>
              <span>Razorpay Route — adapter scaffolded</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "accent" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tracking-tight ${
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
