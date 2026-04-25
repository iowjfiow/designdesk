export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveAccessToken, readClientCookie } from "@/lib/client-token";
import { ok, fail, handleError } from "@/lib/http";
import { getPaymentProvider } from "@/lib/payments";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("t");
    const tokenFromCookie = await readClientCookie(id);
    const tokenCtx = await resolveAccessToken(tokenFromQuery ?? tokenFromCookie ?? "");

    const project = await prisma.project.findUnique({
      where: { id },
      include: { order: { include: { payments: true } }, clientContact: true },
    });
    if (!project) return fail(404, "Project not found");

    const isClient = !!tokenCtx && tokenCtx.projectId === project.id && tokenCtx.role === "CLIENT";
    const isAdmin = !!me && me.role === "ADMIN";
    if (!isClient && !isAdmin) return fail(403, "Only the client can pay");

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
      customerEmail: project.clientContact.email,
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
      actorId: me?.id ?? null,
      projectId: project.id,
      action: "payment.intent_created",
      metadata: {
        provider: provider.name,
        intentId: created.intentId,
        amount: project.order.totalMinor,
        viewer: isClient ? "client" : "admin",
      },
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
