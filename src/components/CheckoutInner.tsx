"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe, Stripe as StripeJs, StripeElements } from "@stripe/stripe-js";
import { Button } from "@/components/ui/Button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";

export function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cs = params.get("cs");
  const pk = params.get("pk");
  const projectId = params.get("pid");
  const [stripe, setStripe] = useState<StripeJs | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pk) return;
    void loadStripe(pk).then((s) => setStripe(s));
  }, [pk]);

  useEffect(() => {
    if (!stripe || !cs || elements) return;
    const els = stripe.elements({ clientSecret: cs });
    const payment = els.create("payment");
    payment.mount("#payment-element");
    setElements(els);
  }, [stripe, cs, elements]);

  async function pay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/projects/${projectId}`,
      },
    });
    setSubmitting(false);
    if (err) setError(err.message ?? "Payment failed");
    else router.push(`/dashboard/projects/${projectId}`);
  }

  if (!cs || !pk || !projectId) {
    return <main className="mx-auto max-w-md px-6 py-16"><Card><CardSubtitle>Missing checkout parameters.</CardSubtitle></Card></main>;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardTitle>Pay & fund escrow</CardTitle>
        <CardSubtitle>
          Funds are held by the platform until milestones are approved. Powered by Stripe (test mode).
        </CardSubtitle>
        <div id="payment-element" className="mt-4 min-h-[260px]" />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <Button className="mt-4 w-full" variant="accent" loading={submitting} onClick={pay}>
          Pay now
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Use test card 4242 4242 4242 4242, any future date, any CVC, any ZIP.
        </p>
      </Card>
    </main>
  );
}
