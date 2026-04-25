import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Lock, Users, Wallet, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          DesignDesk
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          <Link href="/signup"><Button variant="accent" size="sm">Get started</Button></Link>
        </div>
      </header>

      <section className="mt-16">
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Freelance work, with the trust built in.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          DesignDesk is a dual-mode collaboration platform: work with a partner who brings clients,
          or run solo — same structured pricing, escrow, milestones, and transparency either way.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup">
            <Button size="lg" variant="accent">
              Create an account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <Users className="h-5 w-5" />, title: "Dual-mode", body: "Switch between Solo and Collaboration with one toggle. Each project is tagged." },
          { icon: <Lock className="h-5 w-5" />, title: "Order locking", body: "Pricing, scope and add-ons are frozen at confirmation. No hidden surprises." },
          { icon: <Wallet className="h-5 w-5" />, title: "Real escrow", body: "Funds captured into platform escrow; released milestone by milestone via Stripe Connect." },
          { icon: <Shield className="h-5 w-5" />, title: "Tamper-evident", body: "Hash-chained chat, immutable activity log, signed webhooks, role-based access." },
        ].map((f) => (
          <div key={f.title} className="surface p-5">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              {f.icon}
            </div>
            <div className="font-medium">{f.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-24 border-t border-border pt-6 text-xs text-muted-foreground">
        DesignDesk is a starter MVP. Stripe Connect is wired in test mode; Razorpay Route adapter is
        scaffolded for India payouts. Configure your provider in <code>.env</code>.
      </footer>
    </main>
  );
}
