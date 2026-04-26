export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { bpsOf, formatMoney } from "@/lib/money";
import { sendEmail } from "@/lib/email";
import { notifyMany } from "@/lib/notify";

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

    // Confirmation emails — both the client and the designer/manager get a
    // copy summarising the locked scope. Magic-link is intentionally omitted
    // (the client already has it from the initial invite email).
    const detailed = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        clientContact: { select: { email: true, name: true } },
        designer: { select: { email: true, name: true } },
        manager: { select: { email: true, name: true } },
        order: { include: { addons: true } },
      },
    });
    if (detailed?.order) {
      const detailedOrder = detailed.order;
      const totalText = formatMoney(detailedOrder.totalMinor, detailedOrder.currency);
      const lineItems = [
        `${detailedOrder.packageNameSnapshot} — ${formatMoney(detailedOrder.packagePriceMinor, detailedOrder.currency)}`,
        ...detailedOrder.addons.map(
          (a) => `+ ${a.nameSnapshot} — ${formatMoney(a.priceMinor, detailedOrder.currency)}`,
        ),
      ].join("\n");
      const summary = `Project: ${detailed.code} — ${detailed.title}\nTotal: ${totalText} (incl. tax)\n\nScope:\n${lineItems}`;

      const sendOne = async (to: string | undefined, name: string | null | undefined, role: "client" | "team") => {
        if (!to) return;
        const greeting = name ? `Hi ${name}` : "Hi";
        const intro =
          role === "client"
            ? `Your scope has been confirmed and the order is locked. The agreed total is ${totalText} (incl. tax). You can now proceed to payment via your project page.`
            : `Scope is locked and the order is awaiting payment from the client. Total: ${totalText}.`;
        await sendEmail({
          to,
          subject: `${detailed.code} — order confirmed`,
          bodyText: `${greeting},\n\n${intro}\n\n${summary}\n\n— DesignDesk`,
        });
      };
      await Promise.all([
        sendOne(detailed.clientContact?.email, detailed.clientContact?.name ?? null, "client"),
        sendOne(detailed.designer?.email, detailed.designer?.name ?? null, "team"),
        sendOne(detailed.manager?.email, detailed.manager?.name ?? null, "team"),
      ]);
      const recipients = [detailed.designer?.email && project.designerId, detailed.manager?.email && project.managerId]
        .filter((x): x is string => typeof x === "string");
      await notifyMany(recipients, {
        title: `${detailed.code} — order confirmed`,
        body: `Scope locked at ${totalText}. Awaiting client payment.`,
        href: `/dashboard/projects/${project.id}`,
      });
    }

    return ok({ ok: true, fullyApproved: true });
  } catch (e) {
    return handleError(e);
  }
}
