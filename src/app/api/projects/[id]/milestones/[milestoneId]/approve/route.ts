export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { releaseMilestone } from "@/lib/escrow";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const me = await requireUser();
    const { id, milestoneId } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { milestones: { orderBy: { order: "asc" } }, order: { include: { payments: true } } },
    });
    if (!project) return fail(404, "Project not found");
    if (project.clientId !== me.id && me.role !== "ADMIN") {
      return fail(403, "Only the client can approve");
    }
    if (project.status === "DISPUTED") return fail(409, "Project is under dispute");
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return fail(404, "Milestone not found");
    if (milestone.status !== "SUBMITTED") {
      return fail(409, `Cannot approve from status ${milestone.status}`);
    }
    const payment = project.order?.payments.find(
      (p) => p.status === "CAPTURED" || p.status === "PARTIALLY_RELEASED",
    );
    if (!payment) return fail(409, "No captured payment to release");

    const released = await releaseMilestone({ project, milestone, payment });

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await prisma.approval.create({
      data: { projectId: id, milestoneId, kind: "CLIENT_APPROVE", clientId: me.id },
    });
    // If this was the last milestone, mark COMPLETED. Otherwise resume IN_PROGRESS on next.
    const remaining = project.milestones.filter(
      (m) => m.id !== milestoneId && m.status !== "APPROVED",
    );
    const next = remaining.sort((a, b) => a.order - b.order)[0];
    if (!next) {
      await prisma.project.update({ where: { id }, data: { status: "COMPLETED" } });
    } else {
      await prisma.milestone.update({ where: { id: next.id }, data: { status: "IN_PROGRESS" } });
      await prisma.project.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }

    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "milestone.approved",
      metadata: { milestoneId, released },
    });
    await notifyMany([project.designerId, ...(project.managerId ? [project.managerId] : [])], {
      title: `${milestone.title} approved`,
      body: `Funds released for project ${project.code}.`,
      href: `/dashboard/wallet`,
    });

    return ok({ ok: true, released });
  } catch (e) {
    return handleError(e);
  }
}
