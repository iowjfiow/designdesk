export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

/**
 * Designer accepts the order after escrow has been funded.
 * Project transitions PAID → IN_PROGRESS.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { order: true, clientContact: true },
    });
    if (!project) return fail(404, "Project not found");
    if (project.designerId !== me.id && me.role !== "ADMIN") {
      return fail(403, "Only the designer can accept");
    }
    if (project.status !== "PAID") {
      return fail(409, `Cannot accept from status ${project.status}`);
    }
    await prisma.project.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
    await prisma.approval.create({
      data: { projectId: id, kind: "MILESTONE_DESIGNER_SUBMIT", designerId: me.id },
    });
    await prisma.milestone.updateMany({
      where: { projectId: id, order: 1, status: "PENDING" },
      data: { status: "IN_PROGRESS" },
    });
    await logActivity({ actorId: me.id, projectId: id, action: "designer.accepted" });
    if (project.managerId) {
      await notifyMany([project.managerId], {
        title: "Designer accepted the project",
        body: `${project.code} — work has started.`,
        href: `/dashboard/projects/${id}`,
      });
    }
    await sendEmail({
      to: project.clientContact.email,
      subject: `${project.code}: designer accepted \u2014 work has started`,
      bodyText: `Hi${project.clientContact.name ? " " + project.clientContact.name : ""}, the designer has accepted your project and started work. Open your project link for updates.`,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
