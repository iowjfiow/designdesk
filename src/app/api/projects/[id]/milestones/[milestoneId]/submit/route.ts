export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { SubmitMilestoneSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const me = await requireUser();
    const { id, milestoneId } = await params;
    const body = SubmitMilestoneSchema.parse(await req.json().catch(() => ({})));
    const project = await prisma.project.findUnique({ where: { id }, include: { milestones: true } });
    if (!project) return fail(404, "Project not found");
    if (project.designerId !== me.id && me.role !== "ADMIN") {
      return fail(403, "Only the designer can submit a milestone");
    }
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return fail(404, "Milestone not found");
    if (!["PENDING", "IN_PROGRESS", "REJECTED"].includes(milestone.status)) {
      return fail(409, `Cannot submit from status ${milestone.status}`);
    }
    const deliverables = await prisma.deliverable.count({ where: { milestoneId } });
    if (deliverables === 0) {
      return fail(400, "Upload at least one deliverable before submitting");
    }
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await prisma.project.update({ where: { id }, data: { status: "IN_REVIEW" } });
    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "milestone.submitted",
      metadata: { milestoneId, notes: body.notes },
    });
    await notify(project.clientId, {
      title: `Review requested on ${milestone.title}`,
      body: `Project ${project.code} has new work to review.`,
      href: `/dashboard/projects/${id}`,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
