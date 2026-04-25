export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { getPaymentProvider } from "@/lib/payments";
import { logActivity } from "@/lib/activity";

/**
 * Begin payment for a locked order. Returns the provider intent details
 * the client uses to confirm payment. Funds are captured to the *platform*
 * balance and only released milestone-by-milestone via /milestones/[id]/approve.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { order: { include: { payments: true } }, client: true },
    });
    if (!project) return fail(404, "Project not found");
    if (project.clientId !== me.id && me.role !== "ADMIN") {
      return fail(403, "Only the client can pay");
    }
    if (!project.order || !project.order.locked) {
      return fail(400, "Order must be locked before payment");
    }
    const existing = project.order.payments.find(
      (p) => p.status === "REQUIRES_PAYMENT" || p.status === "PROCESSING" || p.status === "CAPTURED",
    );
    if (existing && existing.providerIntentId && existing.clientSecret) {
      return ok({
        intentId: existing.providerIntentId,
        clientSecret: existing.clientSecret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
      });
    }

    const provider = getPaymentProvider();
    const created = await provider.createOrder({
      orderId: project.order.id,
      total: { amount: project.order.totalMinor, currency: project.order.currency },
      description: `${project.code} — ${project.title}`,
      customerEmail: project.client.email,
      metadata: { projectId: project.id },
    });

    await prisma.payment.create({
      data: {
        orderId: project.order.id,
        provider: provider.name === "stripe" ? "STRIPE" : "RAZORPAY",
        providerIntentId: created.intentId,
        clientSecret: created.clientSecret,
        amountMinor: project.order.totalMinor,
        currency: project.order.currency,
        status: "REQUIRES_PAYMENT",
      },
    });

    await logActivity({
      actorId: me.id,
      projectId: project.id,
      action: "payment.intent_created",
      metadata: { provider: provider.name, intentId: created.intentId, amount: project.order.totalMinor },
    });

    return ok({
      intentId: created.intentId,
      clientSecret: created.clientSecret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}
