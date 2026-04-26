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
  Users,
  Wallet,
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-grid">
      <div className="mx-auto max-w-6xl px-6">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md accent-gradient shadow-sm" />
            DesignDesk
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="accent" size="sm">
                Get started
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="chip chip-accent">
              <Sparkles className="h-3 w-3" />
              Phase 1 — magic-link clients shipped
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Freelance work,{" "}
              <span className="gradient-text">with the trust built in.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Structured pricing, mutual scope approval, escrowed payments and milestone releases —
              whether you run solo or with a partner who brings clients.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" variant="accent">
                  Create an account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  I have an account
                </Button>
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
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
            <div className="absolute -inset-6 -z-10 rounded-3xl accent-gradient opacity-15 blur-2xl" />
            <div className="surface-elevated overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <div className="ml-3 text-xs text-muted-foreground">
                  designdesk.app/dashboard/projects/DD-9F2A
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-5">
                <PreviewStat label="Escrow" value="₹49,500" />
                <PreviewStat label="Released" value="₹14,850" tone="success" />
                <PreviewStat label="Pending" value="3 milestones" tone="accent" />
              </div>
              <div className="border-t border-border px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Mutual approval</div>
                <div className="mt-3 space-y-2">
                  <PreviewApproval label="Designer" approved />
                  <PreviewApproval label="Client manager" approved />
                  <PreviewApproval label="Scope locked" approved final />
                </div>
              </div>
              <div className="border-t border-border px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Milestones</div>
                <div className="mt-3 space-y-2 text-sm">
                  <PreviewMilestone title="Concept" amount="₹14,850" status="approved" />
                  <PreviewMilestone title="Revision" amount="₹14,850" status="submitted" />
                  <PreviewMilestone title="Final" amount="₹19,800" status="pending" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Users className="h-5 w-5" />, title: "Dual-mode", body: "Solo or with a Client Manager — switch with one toggle. Each project is tagged." },
            { icon: <KeyRound className="h-5 w-5" />, title: "Magic-link clients", body: "Clients never sign up. They get a private link with full approval rights." },
            { icon: <Lock className="h-5 w-5" />, title: "Mutual scope lock", body: "Both designer and manager must approve. After lock, scope is frozen." },
            { icon: <Wallet className="h-5 w-5" />, title: "Real escrow", body: "Stripe Connect holds funds; releases per milestone, splits per agreed BPS." },
            { icon: <Hash className="h-5 w-5" />, title: "Tamper-evident", body: "Hash-chained chat, immutable activity log, signed webhooks." },
            { icon: <Shield className="h-5 w-5" />, title: "Anti-scam by design", body: "No work without a system order. No payment outside the platform." },
            { icon: <Receipt className="h-5 w-5" />, title: "Structured pricing", body: "Base packages + add-ons, taxes, live total, locked at confirmation." },
            { icon: <GitFork className="h-5 w-5" />, title: "Milestone releases", body: "30 / 30 / 40 default. Approve to release the corresponding share." },
            { icon: <Sparkles className="h-5 w-5" />, title: "Built for trust", body: "Activity log, payment ledger, dispute flow with frozen escrow." },
          ].map((f) => (
            <div key={f.title} className="surface group p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                {f.icon}
              </div>
              <div className="text-sm font-semibold tracking-tight">{f.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="surface-elevated relative my-8 overflow-hidden p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full accent-gradient opacity-10 blur-3xl" />
          <div className="grid items-center gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Try it with the demo accounts
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Run two browsers side-by-side. Sign in as the designer in one and the client manager
                in another to see the mutual-approval flow live. Clients themselves don&apos;t need
                an account.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/login">
                <Button size="lg" variant="accent">
                  Open the demo <ArrowRight className="h-4 w-4" />
                </Button>
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
          approved ? (final ? "accent-gradient text-white" : "bg-success/15 text-success") : "bg-muted text-muted-foreground"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      <span className={final ? "font-medium" : ""}>{label}</span>
      {approved ? (
        <span className="ml-auto text-xs text-muted-foreground">approved</span>
      ) : (
        <span className="ml-auto text-xs text-muted-foreground">pending</span>
      )}
    </div>
  );
}

function PreviewMilestone({ title, amount, status }: { title: string; amount: string; status: "approved" | "submitted" | "pending" }) {
  const statusStyles = {
    approved: "bg-success/10 text-success border-success/20",
    submitted: "bg-warning/10 text-warning border-warning/20",
    pending: "bg-muted text-muted-foreground border-border",
  }[status];
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-3">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusStyles}`}>{status}</span>
        <span className="font-medium">{title}</span>
      </div>
      <span className="text-sm text-muted-foreground">{amount}</span>
    </div>
  );
}
