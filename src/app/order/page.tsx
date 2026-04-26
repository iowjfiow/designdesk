import Link from "next/link";
import { OrderForm } from "@/components/OrderForm";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PublicOrderPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            DesignDesk
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Designer / Manager login →
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Place an order</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what you need — pick a package, choose any add-ons, share your contact info.
            A designer picks it up from there. No signup required, and you&apos;ll get a private link
            to track every step.
          </p>
        </div>
        <OrderForm />
      </section>
    </main>
  );
}
