// Provider-agnostic payment surface. Stripe Connect and Razorpay Route both fit
// this shape. `Money` is always in minor units.

export type Money = { amount: number; currency: string };

export type CreateOrderInput = {
  /** Locked total to capture into platform escrow. */
  total: Money;
  /** Stable id (our Order.id) — provider stores it as metadata. */
  orderId: string;
  /** Client-facing description shown on the payment sheet. */
  description: string;
  /** For email receipts where supported. */
  customerEmail?: string;
  metadata?: Record<string, string>;
};

export type CreatedOrder = {
  /** Provider intent / order id (pi_… or rzp_order_…). */
  intentId: string;
  /** Client-side secret/token used to confirm payment. */
  clientSecret: string | null;
  /** For Razorpay where checkout uses key+orderId. */
  publicHandle?: { keyId: string; orderId: string };
};

export type ConnectStatus = {
  accountId: string;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type TransferInput = {
  /** Provider account id of the recipient (acct_… or acc_…). */
  destinationAccountId: string;
  amount: Money;
  /** Source charge / payment id, when the provider needs it (Stripe). */
  sourceChargeId?: string | null;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
};

export type TransferResult = {
  transferId: string;
  status: "completed" | "pending" | "failed";
  failureReason?: string;
};

export type RefundInput = {
  /** For Stripe: the PaymentIntent id; for Razorpay: payment id. */
  intentId: string;
  amount: Money;
  reason?: string;
};

export type RefundResult = {
  refundId: string;
  status: "succeeded" | "pending" | "failed";
};

export interface PaymentProvider {
  readonly name: "stripe" | "razorpay";

  /** Create the payment intent / order that the client will pay. */
  createOrder(input: CreateOrderInput): Promise<CreatedOrder>;

  /** Begin onboarding: returns a hosted onboarding URL the user must visit. */
  createConnectOnboarding(input: {
    userId: string;
    email: string;
    existingAccountId?: string | null;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ accountId: string; url: string }>;

  getConnectStatus(accountId: string): Promise<ConnectStatus>;

  /** Disburse part of the held funds to a connected account. */
  transfer(input: TransferInput): Promise<TransferResult>;

  refund(input: RefundInput): Promise<RefundResult>;

  /** Verify webhook signature and return the parsed event. */
  parseWebhook(rawBody: string, headers: Record<string, string>): Promise<{
    type: string;
    data: unknown;
  }>;
}
