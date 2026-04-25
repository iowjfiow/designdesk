import { Suspense } from "react";
import { CheckoutInner } from "@/components/CheckoutInner";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
