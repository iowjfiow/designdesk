export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";

/**
 * Archive a completed project. Removes it from the active dashboard list
 * but does not delete any data. Restricted to designer / manager / admin.
 * Only allowed once the project status is COMPLETED.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    const isStaff =
      me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN";
    if (!isStaff) return fail(403, "Only project parties can archive");
    if (project.status !== "COMPLETED")
      return fail(409, "Only completed projects can be archived");
    if (project.archivedAt) return ok({ ok: true, alreadyArchived: true });
    await prisma.project.update({ where: { id }, data: { archivedAt: new Date() } });
    await logActivity({ actorId: me.id, projectId: id, action: "project.archived" });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    const isStaff =
      me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN";
    if (!isStaff) return fail(403, "Only project parties can unarchive");
    if (!project.archivedAt) return ok({ ok: true, alreadyActive: true });
    await prisma.project.update({ where: { id }, data: { archivedAt: null } });
    await logActivity({ actorId: me.id, projectId: id, action: "project.unarchived" });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
