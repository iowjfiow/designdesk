export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { bpsOf } from "@/lib/money";

/**
 * Mutual scope approval. Each side (Designer / Client Manager) calls this once
 * to record their approval. When all required approvals are in (designer always;
 * manager too in COLLAB), we lock the order and generate the standard milestone
 * schedule (Concept / Revisions / Final = 30/30/40).
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
    if (!project.order) return fail(400, "Project has no order");
    if (project.order.locked) return fail(409, "Order is already locked");

    const isDesigner = me.id === project.designerId;
    const isManager = !!project.managerId && me.id === project.managerId;
    const isAdmin = me.role === "ADMIN";
    if (!isDesigner && !isManager && !isAdmin) {
      return fail(403, "Only Designer or Client Manager can approve");
    }

    const now = new Date();
    const updates: { designerApprovedAt?: Date; managerApprovedAt?: Date } = {};
    if (isDesigner && !project.designerApprovedAt) updates.designerApprovedAt = now;
    if (isManager && !project.managerApprovedAt) updates.managerApprovedAt = now;
    if (isAdmin) {
      if (!project.designerApprovedAt) updates.designerApprovedAt = now;
      if (project.managerId && !project.managerApprovedAt) updates.managerApprovedAt = now;
    }

    const designerApprovedAt = updates.designerApprovedAt ?? project.designerApprovedAt;
    const managerApprovedAt = updates.managerApprovedAt ?? project.managerApprovedAt;
    const requiresManager = project.mode === "COLLAB" && !!project.managerId;
    const fullyApproved = !!designerApprovedAt && (!requiresManager || !!managerApprovedAt);

    if (!fullyApproved) {
      // Just record the approval; status -> AWAITING_APPROVAL if not already.
      const newStatus = project.status === "DRAFT" ? "AWAITING_APPROVAL" : project.status;
      await prisma.project.update({
        where: { id: project.id },
        data: { ...updates, status: newStatus },
      });
      await prisma.approval.create({
        data: {
          projectId: project.id,
          kind: isManager ? "SCOPE_MANAGER" : "SCOPE_DESIGNER",
          designerId: isDesigner || isAdmin ? me.id : null,
          managerId: isManager ? me.id : null,
        },
      });
      await logActivity({
        actorId: me.id,
        projectId: project.id,
        action: isManager ? "scope.approved.manager" : "scope.approved.designer",
      });
      return ok({ ok: true, fullyApproved: false, designerApprovedAt, managerApprovedAt });
    }

    const total = project.order.totalMinor;
    const m1 = bpsOf(total, 3000); // 30% concept
    const m2 = bpsOf(total, 3000); // 30% revisions
    const m3 = total - m1 - m2;    // remainder = final delivery

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: project.order!.id },
        data: { locked: true, lockedAt: now },
      });
      await tx.project.update({
        where: { id: project.id },
        data: {
          ...updates,
          status: "AWAITING_PAYMENT",
        },
      });
      await tx.approval.create({
        data: {
          projectId: project.id,
          kind: isManager ? "SCOPE_MANAGER" : "SCOPE_DESIGNER",
          designerId: isDesigner || isAdmin ? me.id : null,
          managerId: isManager ? me.id : null,
        },
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

    return ok({ ok: true, fullyApproved: true });
  } catch (e) {
    return handleError(e);
  }
}
