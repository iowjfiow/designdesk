export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { getPaymentProvider } from "@/lib/payments";
import { logActivity } from "@/lib/activity";

/**
 * Designer / Manager kicks off Connect onboarding so they can receive payouts.
 */
export async function POST() {
  try {
    const me = await requireUser();
    if (!["DESIGNER", "CLIENT_MANAGER", "ADMIN"].includes(me.role)) {
      return fail(403, "Only designers and managers need Connect onboarding");
    }
    const provider = getPaymentProvider();
    const onboarding = await provider.createConnectOnboarding({
      userId: me.id,
      email: me.email,
      existingAccountId: provider.name === "stripe" ? me.stripeAccountId : me.razorpayAccountId,
      returnUrl: process.env.STRIPE_CONNECT_RETURN_URL ?? "http://localhost:3000/dashboard/wallet",
      refreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL ?? "http://localhost:3000/dashboard/wallet",
    });
    await prisma.user.update({
      where: { id: me.id },
      data: provider.name === "stripe"
        ? { stripeAccountId: onboarding.accountId }
        : { razorpayAccountId: onboarding.accountId },
    });
    await logActivity({
      actorId: me.id,
      action: "connect.onboarding_started",
      metadata: { provider: provider.name, accountId: onboarding.accountId },
    });
    return ok({ url: onboarding.url, accountId: onboarding.accountId });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Refresh Connect status (called from the wallet page after returning from Stripe).
 */
export async function GET() {
  try {
    const me = await requireUser();
    const accountId = me.stripeAccountId ?? me.razorpayAccountId;
    if (!accountId) return ok({ status: null });
    const provider = getPaymentProvider();
    const status = await provider.getConnectStatus(accountId);
    await prisma.user.update({
      where: { id: me.id },
      data: { payoutsEnabled: status.payoutsEnabled },
    });
    // Promote any pending wallet entries to available now that payouts are enabled
    if (status.payoutsEnabled) {
      await prisma.walletEntry.updateMany({
        where: { userId: me.id, state: "pending" },
        data: { state: "available" },
      });
    }
    return ok({ status });
  } catch (e) {
    return handleError(e);
  }
}
