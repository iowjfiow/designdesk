import "server-only";
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

// Razorpay Route adapter — interface-only stub. Wire up `razorpay` SDK and the
// Linked Accounts / Transfers APIs to make it functional. Same-shape calls so
// the rest of the codebase doesn't change when you swap providers.
export const razorpayProvider: PaymentProvider = {
  name: "razorpay",

  async createOrder(_input: CreateOrderInput): Promise<CreatedOrder> {
    throw new Error("Razorpay adapter not yet implemented. Set PAYMENT_PROVIDER=stripe.");
  },

  async createConnectOnboarding(_input): Promise<{ accountId: string; url: string }> {
    throw new Error("Razorpay onboarding not yet implemented.");
  },

  async getConnectStatus(_accountId: string): Promise<ConnectStatus> {
    throw new Error("Razorpay status not yet implemented.");
  },

  async transfer(_input: TransferInput): Promise<TransferResult> {
    throw new Error("Razorpay transfers not yet implemented.");
  },

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error("Razorpay refunds not yet implemented.");
  },

  async parseWebhook(_rawBody: string, _headers: Record<string, string>) {
    throw new Error("Razorpay webhooks not yet implemented.");
  },
};
