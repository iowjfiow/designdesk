export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { SubmitMilestoneSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const me = await requireUser();
    const { id, milestoneId } = await params;
    const body = SubmitMilestoneSchema.parse(await req.json().catch(() => ({})));
    const project = await prisma.project.findUnique({
      where: { id },
      include: { milestones: true, clientContact: true },
    });
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
    if (project.managerId) {
      await notify(project.managerId, {
        title: `Review requested on ${milestone.title}`,
        body: `Project ${project.code} has new work pending client review.`,
        href: `/dashboard/projects/${id}`,
      });
    }
    await sendEmail({
      to: project.clientContact.email,
      subject: `${project.code}: ${milestone.title} \u2014 ready for your review`,
      bodyText: `Hi${project.clientContact.name ? " " + project.clientContact.name : ""}, the designer has uploaded work for review on "${project.title}". Open your project link to approve or request a revision.`,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
