export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { RaiseDisputeSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const body = RaiseDisputeSchema.parse(await req.json());
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    if (![project.designerId, project.managerId, project.clientId].includes(me.id)) {
      return fail(403, "Only project parties can raise a dispute");
    }
    if (project.status === "COMPLETED") return fail(409, "Project already completed");

    await prisma.$transaction([
      prisma.dispute.create({
        data: { projectId: id, raisedById: me.id, reason: body.reason },
      }),
      prisma.project.update({ where: { id }, data: { status: "DISPUTED" } }),
    ]);
    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "dispute.raised",
      metadata: { reason: body.reason },
    });
    const others = [project.designerId, project.managerId, project.clientId]
      .filter((x): x is string => Boolean(x) && x !== me.id);
    await notifyMany(others, {
      title: "Dispute raised",
      body: `${project.code}: escrow funds frozen pending resolution.`,
      href: `/dashboard/projects/${id}`,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
