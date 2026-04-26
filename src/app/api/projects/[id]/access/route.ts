export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { issueAccessToken, buildMagicLinkPath } from "@/lib/client-token";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    const isStaff = me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN";
    if (!isStaff) return fail(403, "Only designer or manager can issue links");

    const { token } = await issueAccessToken({ projectId: id, role: "CLIENT", label: "client" });
    const origin = new URL(req.url).origin;
    const base = process.env.APP_BASE_URL || origin;
    const magicLink = `${base}${buildMagicLinkPath(token)}`;
    await logActivity({ actorId: me.id, projectId: id, action: "access.token_issued" });
    return ok({ magicLink });
  } catch (e) {
    return handleError(e);
  }
}
