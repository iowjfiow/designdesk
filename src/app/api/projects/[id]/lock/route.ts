export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { bpsOf } from "@/lib/money";

/**
 * Lock the order: pricing/scope are frozen and standard milestones are
 * created (Concept / Revision / Final = 30/30/40). Mode is recorded.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { order: true, milestones: true },
    });
    if (!project) return fail(404, "Project not found");
    if (![project.designerId, project.managerId].includes(me.id) && me.role !== "ADMIN") {
      return fail(403, "Only Designer or Manager can lock");
    }
    if (!project.order) return fail(400, "Project has no order");
    if (project.order.locked) return fail(409, "Order is already locked");

    const total = project.order.totalMinor;
    const m1 = bpsOf(total, 3000); // 30% concept
    const m2 = bpsOf(total, 3000); // 30% revisions
    const m3 = total - m1 - m2;    // remainder = final delivery

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: project.order!.id },
        data: { locked: true, lockedAt: new Date() },
      });
      await tx.project.update({
        where: { id: project.id },
        data: { status: "AWAITING_PAYMENT" },
      });
      if (project.milestones.length === 0) {
        await tx.milestone.createMany({
          data: [
            {
              projectId: project.id,
              kind: "CONCEPT",
              title: "Initial concepts",
              releaseBps: 3000,
              amountMinor: m1,
              currency: project.order!.currency,
              order: 1,
            },
            {
              projectId: project.id,
              kind: "REVISION",
              title: "Revisions",
              releaseBps: 3000,
              amountMinor: m2,
              currency: project.order!.currency,
              order: 2,
            },
            {
              projectId: project.id,
              kind: "FINAL",
              title: "Final delivery",
              releaseBps: 4000,
              amountMinor: m3,
              currency: project.order!.currency,
              order: 3,
            },
          ],
        });
      }
    });

    await logActivity({
      actorId: me.id,
      projectId: project.id,
      action: "order.locked",
      metadata: { totalMinor: total, currency: project.order.currency },
    });

    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
