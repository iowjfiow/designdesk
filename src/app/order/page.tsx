import Link from "next/link";
import { OrderForm } from "@/components/OrderForm";
import { CheckCircle2, KeyRound, Lock, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PublicOrderPage() {
  return (
    <main className="min-h-screen bg-background bg-grid">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            DesignDesk
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Designer / Manager login →
          </Link>
        </div>
      </header>
      <section className="bg-aurora">
        <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <div className="max-w-2xl">
            <div className="chip chip-accent">
              <Sparkles className="h-3 w-3" /> No signup required
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Place an order in <span className="gradient-text">a few minutes.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Pick a package, add what you need, share your contact info. A designer picks it up
              and you get a private link to track every step.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Live total &amp; tax
              </li>
              <li className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                Magic-link to your project
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-accent" />
                Escrow-backed payments
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <OrderForm />
      </section>
    </main>
  );
}
