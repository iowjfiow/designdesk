export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";

/**
 * Mark all open disputes on a project as resolved. Restricted to project
 * staff (designer / manager / admin). Restores the project to IN_PROGRESS
 * if there's a captured payment, otherwise SCOPE_APPROVED. Optional
 * `resolutionNotes` field.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { disputes: true, order: { include: { payments: true } } },
    });
    if (!project) return fail(404, "Project not found");
    const isStaff =
      me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN";
    if (!isStaff) return fail(403, "Only project parties can resolve disputes");
    if (project.status !== "DISPUTED") return fail(409, "Project is not under dispute");

    let notes: string | null = null;
    try {
      const json = (await req.json()) as { resolutionNotes?: string } | null;
      if (json?.resolutionNotes && json.resolutionNotes.trim()) {
        notes = json.resolutionNotes.trim().slice(0, 2000);
      }
    } catch {
      // body is optional
    }

    const open = project.disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");
    if (open.length === 0) return fail(409, "No open disputes to resolve");

    const hasCaptured = project.order?.payments.some(
      (p) => p.status === "CAPTURED" || p.status === "PARTIALLY_RELEASED",
    );
    const newStatus = hasCaptured ? "IN_PROGRESS" : "SCOPE_APPROVED";

    await prisma.$transaction([
      prisma.dispute.updateMany({
        where: { projectId: id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
        data: {
          status: "RESOLVED_RELEASE",
          resolvedAt: new Date(),
          ...(notes ? { resolutionNotes: notes } : {}),
        },
      }),
      prisma.project.update({ where: { id }, data: { status: newStatus } }),
    ]);
    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "dispute.resolved",
      metadata: { resolved: open.length, notes },
    });
    const recipients = [project.designerId, project.managerId]
      .filter((x): x is string => Boolean(x) && x !== me.id);
    await notifyMany(recipients, {
      title: "Dispute resolved",
      body: `${project.code}: dispute marked resolved by ${me.name ?? me.email}.`,
      href: `/dashboard/projects/${id}`,
    });
    return ok({ ok: true, status: newStatus, resolved: open.length });
  } catch (e) {
    return handleError(e);
  }
}
