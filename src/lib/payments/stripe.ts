import "server-only";
import Stripe from "stripe";
import type {
  PaymentProvider,
  CreateOrderInput,
  CreatedOrder,
  ConnectStatus,
  TransferInput,
  TransferResult,
  RefundInput,
  RefundResult,
} from "./provider";

function client(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  // Use the SDK's own pinned API version for type safety.
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const s = client();
    // We capture into the *platform* balance and disburse later via transfers.
    // Setting transfer_group lets us link transfers back to this charge.
    const intent = await s.paymentIntents.create(
      {
        amount: input.total.amount,
        currency: input.total.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        transfer_group: `order_${input.orderId}`,
        description: input.description,
        receipt_email: input.customerEmail,
        metadata: { orderId: input.orderId, ...(input.metadata ?? {}) },
      },
      { idempotencyKey: `order_create_${input.orderId}` },
    );
    return {
      intentId: intent.id,
      clientSecret: intent.client_secret,
    };
  },

  async createConnectOnboarding(input) {
    const s = client();
    let accountId = input.existingAccountId ?? null;
    if (!accountId) {
      const account = await s.accounts.create({
        type: "express",
        email: input.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { userId: input.userId },
      });
      accountId = account.id;
    }
    const link = await s.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
    });
    return { accountId, url: link.url };
  },

  async getConnectStatus(accountId: string): Promise<ConnectStatus> {
    const s = client();
    const acct = await s.accounts.retrieve(accountId);
    return {
      accountId: acct.id,
      payoutsEnabled: Boolean(acct.payouts_enabled),
      detailsSubmitted: Boolean(acct.details_submitted),
    };
  },

  async transfer(input: TransferInput): Promise<TransferResult> {
    const s = client();
    try {
      const t = await s.transfers.create(
        {
          amount: input.amount.amount,
          currency: input.amount.currency.toLowerCase(),
          destination: input.destinationAccountId,
          source_transaction: input.sourceChargeId ?? undefined,
          metadata: input.metadata ?? {},
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      );
      return { transferId: t.id, status: "completed" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "transfer failed";
      return { transferId: "", status: "failed", failureReason: msg };
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    const s = client();
    const r = await s.refunds.create({
      payment_intent: input.intentId,
      amount: input.amount.amount,
      reason: input.reason as Stripe.RefundCreateParams.Reason | undefined,
    });
    return {
      refundId: r.id,
      status: r.status === "succeeded" ? "succeeded" : r.status === "pending" ? "pending" : "failed",
    };
  },

  async parseWebhook(rawBody: string, headers: Record<string, string>) {
    const sig = headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      throw new Error("Missing webhook signature or STRIPE_WEBHOOK_SECRET");
    }
    const s = client();
    const event = s.webhooks.constructEvent(rawBody, sig, secret);
    return { type: event.type, data: event.data.object };
  },
};
