export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveAccessToken, readClientCookie } from "@/lib/client-token";
import { ok, fail, handleError } from "@/lib/http";
import { RejectMilestoneSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";

/**
 * Client rejects a submitted milestone → status returns to IN_PROGRESS,
 * counted against the package's allowed revisions.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const { id, milestoneId } = await params;
    const me = await getCurrentUser();
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("t");
    const tokenFromCookie = await readClientCookie(id);
    const tokenCtx = await resolveAccessToken(tokenFromQuery ?? tokenFromCookie ?? "");

    const body = RejectMilestoneSchema.parse(await req.json());
    const project = await prisma.project.findUnique({
      where: { id },
      include: { milestones: true, order: { include: { package: true } } },
    });
    if (!project) return fail(404, "Project not found");
    const isClient = !!tokenCtx && tokenCtx.projectId === project.id && tokenCtx.role === "CLIENT";
    const isAdmin = !!me && me.role === "ADMIN";
    if (!isClient && !isAdmin) {
      return fail(403, "Only the client can request a revision");
    }
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return fail(404, "Milestone not found");
    if (milestone.status !== "SUBMITTED") {
      return fail(409, `Cannot reject from status ${milestone.status}`);
    }

    // Count revisions already used (REJECTED → SUBMITTED cycles on REVISION milestones)
    const used = await prisma.activityLog.count({
      where: { projectId: id, action: "milestone.rejected" },
    });
    const allowed = project.order?.package.revisions ?? 0;
    if (used >= allowed) {
      return fail(402, `Revision limit reached (${allowed}). Purchase extra revisions.`);
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: "REJECTED", rejectedAt: new Date() },
    });
    await prisma.project.update({ where: { id }, data: { status: "REVISION_REQUESTED" } });
    await logActivity({
      actorId: me?.id ?? null,
      projectId: id,
      action: "milestone.rejected",
      metadata: { milestoneId, reason: body.reason, used: used + 1, allowed, viewer: isClient ? "client" : "admin" },
    });
    await notify(project.designerId, {
      title: `Revision requested on ${milestone.title}`,
      body: `${project.code}: ${body.reason.slice(0, 200)}`,
      href: `/dashboard/projects/${id}`,
    });
    return ok({ ok: true, revisionsUsed: used + 1, revisionsAllowed: allowed });
  } catch (e) {
    return handleError(e);
  }
}
