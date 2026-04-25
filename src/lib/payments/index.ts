import "server-only";
import type { PaymentProvider } from "./provider";
import { stripeProvider } from "./stripe";
import { razorpayProvider } from "./razorpay";

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();
  if (name === "razorpay") return razorpayProvider;
  return stripeProvider;
}

export { stripeProvider, razorpayProvider };
export type { PaymentProvider } from "./provider";
