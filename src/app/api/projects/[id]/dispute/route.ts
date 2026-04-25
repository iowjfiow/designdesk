export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveAccessToken, readClientCookie } from "@/lib/client-token";
import { ok, fail, handleError } from "@/lib/http";
import { RaiseDisputeSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("t");
    const tokenFromCookie = await readClientCookie(id);
    const tokenCtx = await resolveAccessToken(tokenFromQuery ?? tokenFromCookie ?? "");

    const body = RaiseDisputeSchema.parse(await req.json());
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");

    const isStaff =
      !!me && (me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN");
    const isClient = !!tokenCtx && tokenCtx.projectId === project.id && tokenCtx.role === "CLIENT";
    if (!isStaff && !isClient) {
      return fail(403, "Only project parties can raise a dispute");
    }
    if (project.status === "COMPLETED") return fail(409, "Project already completed");

    await prisma.$transaction([
      prisma.dispute.create({
        data: {
          projectId: id,
          raisedById: isStaff ? me!.id : null,
          raisedByClientContactId: isClient ? project.clientContactId : null,
          reason: body.reason,
        },
      }),
      prisma.project.update({ where: { id }, data: { status: "DISPUTED" } }),
    ]);
    await logActivity({
      actorId: me?.id ?? null,
      projectId: id,
      action: "dispute.raised",
      metadata: { reason: body.reason, raisedBy: isClient ? "client" : "staff" },
    });
    const recipients = [project.designerId, project.managerId]
      .filter((x): x is string => Boolean(x) && (!me || x !== me.id));
    await notifyMany(recipients, {
      title: "Dispute raised",
      body: `${project.code}: escrow funds frozen pending resolution.`,
      href: `/dashboard/projects/${id}`,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
