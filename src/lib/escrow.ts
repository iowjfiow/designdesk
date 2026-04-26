import "server-only";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { splitEscrow, bpsOf } from "@/lib/money";
import type { Project, Milestone, Payment } from "@prisma/client";

/**
 * Release the escrow share for one approved milestone.
 *
 * Solo: 100% of the milestone amount goes to the Designer.
 * Collab: split via project's designerBps / managerBps; remainder is platform fee.
 *
 * All transfers are recorded as Transfer rows + WalletEntry rows for ledger
 * transparency. Idempotent on milestoneId.
 */
export async function releaseMilestone(args: {
  project: Project;
  milestone: Milestone;
  payment: Payment;
}): Promise<{ designer: number; manager: number; platformFee: number; transfers: string[] }> {
  const { project, milestone, payment } = args;

  // Idempotency: if we already wrote ESCROW_RELEASE entries for this milestone, no-op.
  const existing = await prisma.walletEntry.findFirst({
    where: {
      projectId: project.id,
      kind: "ESCROW_RELEASE",
      description: `milestone:${milestone.id}`,
    },
  });
  if (existing) {
    return { designer: 0, manager: 0, platformFee: 0, transfers: [] };
  }

  const provider = getPaymentProvider();
  const transferIds: string[] = [];
  let designerShare = 0;
  let managerShare = 0;
  let platformFeeShare = 0;

  if (project.mode === "SOLO") {
    designerShare = milestone.amountMinor;
    platformFeeShare = bpsOf(milestone.amountMinor, project.platformFeeBps);
    designerShare -= platformFeeShare;
  } else {
    const split = splitEscrow(milestone.amountMinor, project.designerBps, project.managerBps);
    designerShare = split.designer;
    managerShare = split.manager;
    platformFeeShare = split.platformFee;
  }

  if (!project.designerId) throw new Error("Project has no designer assigned");
  const designerId = project.designerId;
  const designer = await prisma.user.findUnique({ where: { id: designerId } });
  const manager = project.managerId
    ? await prisma.user.findUnique({ where: { id: project.managerId } })
    : null;

  // Disburse via provider
  if (designerShare > 0 && designer?.stripeAccountId) {
    const t = await provider.transfer({
      destinationAccountId: designer.stripeAccountId,
      amount: { amount: designerShare, currency: payment.currency },
      sourceChargeId: payment.providerChargeId,
      idempotencyKey: `release_${milestone.id}_designer`,
      metadata: { projectId: project.id, milestoneId: milestone.id, role: "designer" },
    });
    await prisma.transfer.create({
      data: {
        paymentId: payment.id,
        recipientUserId: designer.id,
        amountMinor: designerShare,
        currency: payment.currency,
        providerTransferId: t.transferId || null,
        status: t.status,
        failureReason: t.failureReason ?? null,
      },
    });
    if (t.transferId) transferIds.push(t.transferId);
  }

  if (managerShare > 0 && manager?.stripeAccountId) {
    const t = await provider.transfer({
      destinationAccountId: manager.stripeAccountId,
      amount: { amount: managerShare, currency: payment.currency },
      sourceChargeId: payment.providerChargeId,
      idempotencyKey: `release_${milestone.id}_manager`,
      metadata: { projectId: project.id, milestoneId: milestone.id, role: "manager" },
    });
    await prisma.transfer.create({
      data: {
        paymentId: payment.id,
        recipientUserId: manager.id,
        amountMinor: managerShare,
        currency: payment.currency,
        providerTransferId: t.transferId || null,
        status: t.status,
        failureReason: t.failureReason ?? null,
      },
    });
    if (t.transferId) transferIds.push(t.transferId);
  }

  // Ledger entries (always recorded, even if transfer was deferred due to missing Connect account)
  const ledgerOps: Promise<unknown>[] = [];
  if (designerShare > 0) {
    ledgerOps.push(
      prisma.walletEntry.create({
        data: {
          userId: designerId,
          projectId: project.id,
          paymentId: payment.id,
          kind: "ESCROW_RELEASE",
          amountMinor: designerShare,
          currency: payment.currency,
          state: designer?.stripeAccountId ? "available" : "pending",
          description: `milestone:${milestone.id}`,
        },
      }),
    );
  }
  if (managerShare > 0 && project.managerId) {
    ledgerOps.push(
      prisma.walletEntry.create({
        data: {
          userId: project.managerId,
          projectId: project.id,
          paymentId: payment.id,
          kind: "ESCROW_RELEASE",
          amountMinor: managerShare,
          currency: payment.currency,
          state: manager?.stripeAccountId ? "available" : "pending",
          description: `milestone:${milestone.id}`,
        },
      }),
    );
  }
  if (platformFeeShare > 0) {
    ledgerOps.push(
      prisma.walletEntry.create({
        data: {
          userId: designerId, // tracked against project owner for visibility
          projectId: project.id,
          paymentId: payment.id,
          kind: "PLATFORM_FEE",
          amountMinor: -platformFeeShare,
          currency: payment.currency,
          state: "available",
          description: `milestone:${milestone.id}:platform_fee`,
        },
      }),
    );
  }
  await Promise.all(ledgerOps);

  // Update payment counters
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      releasedMinor: { increment: milestone.amountMinor },
      status:
        payment.releasedMinor + milestone.amountMinor >= payment.amountMinor
          ? "RELEASED"
          : "PARTIALLY_RELEASED",
      releasedAt:
        payment.releasedMinor + milestone.amountMinor >= payment.amountMinor
          ? new Date()
          : payment.releasedAt,
    },
  });

  return {
    designer: designerShare,
    manager: managerShare,
    platformFee: platformFeeShare,
    transfers: transferIds,
  };
}
