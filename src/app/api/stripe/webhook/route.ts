import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const provider = getPaymentProvider();
  let event: { type: string; data: unknown };
  try {
    event = await provider.parseWebhook(raw, {
      "stripe-signature": req.headers.get("stripe-signature") ?? "",
    });
  } catch (err) {
    console.error("[stripe.webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data as Stripe.PaymentIntent;
        await onIntentSucceeded(pi);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: { providerIntentId: pi.id },
          data: { status: "FAILED", rawWebhook: pi as unknown as object },
        });
        break;
      }
      case "account.updated": {
        const acct = event.data as Stripe.Account;
        await prisma.user.updateMany({
          where: { stripeAccountId: acct.id },
          data: { payoutsEnabled: Boolean(acct.payouts_enabled) },
        });
        if (acct.payouts_enabled) {
          await prisma.walletEntry.updateMany({
            where: { user: { stripeAccountId: acct.id }, state: "pending" },
            data: { state: "available" },
          });
        }
        break;
      }
      default:
        // Many event types are simply unused in this app
        break;
    }
  } catch (err) {
    console.error("[stripe.webhook] handler error", err);
    // Return 200 anyway so Stripe doesn't retry indefinitely on app bugs.
  }
  return NextResponse.json({ received: true });
}

async function onIntentSucceeded(pi: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { providerIntentId: pi.id },
    include: { order: { include: { project: true } } },
  });
  if (!payment) return;
  const chargeId =
    typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "CAPTURED",
      capturedAt: new Date(),
      providerChargeId: chargeId,
      rawWebhook: pi as unknown as object,
    },
  });
  if (payment.order) {
    const project = payment.order.project;
    await prisma.project.update({
      where: { id: payment.order.projectId },
      data: { status: "PAID" },
    });
    // Record the escrow hold on each beneficiary's wallet (state = locked)
    // so they can see what is in escrow for this project.
    const designerShare = Math.floor((payment.amountMinor * project.designerBps) / 10_000);
    const managerShare = project.managerId
      ? Math.floor((payment.amountMinor * project.managerBps) / 10_000)
      : 0;
    await prisma.walletEntry.create({
      data: {
        userId: project.designerId,
        projectId: project.id,
        paymentId: payment.id,
        kind: "ESCROW_HOLD",
        amountMinor: designerShare,
        currency: payment.currency,
        state: "locked",
        description: "escrow funded — designer share",
      },
    });
    if (project.managerId && managerShare > 0) {
      await prisma.walletEntry.create({
        data: {
          userId: project.managerId,
          projectId: project.id,
          paymentId: payment.id,
          kind: "ESCROW_HOLD",
          amountMinor: managerShare,
          currency: payment.currency,
          state: "locked",
          description: "escrow funded — manager share",
        },
      });
    }
    await logActivity({
      projectId: payment.order.projectId,
      action: "payment.captured",
      metadata: { paymentId: payment.id, intentId: pi.id, amount: payment.amountMinor },
    });
    await notify(payment.order.project.designerId, {
      title: "Escrow funded",
      body: `Project ${payment.order.project.code}: client paid; you can accept the order.`,
      href: `/dashboard/projects/${payment.order.projectId}`,
    });
  }
}
