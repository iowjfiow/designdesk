export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveAccessToken, readClientCookie } from "@/lib/client-token";
import { ok, fail, handleError } from "@/lib/http";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("t") ?? null;
    const tokenFromCookie = await readClientCookie(id);
    const tokenCtx = await resolveAccessToken(tokenFromQuery ?? tokenFromCookie ?? "");

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        designer: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
        manager: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
        clientContact: { select: { id: true, name: true, email: true } },
        order: { include: { addons: true, payments: true } },
        milestones: { orderBy: { order: "asc" }, include: { deliverables: true } },
        deliverables: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "asc" } },
        disputes: true,
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { actor: { select: { id: true, name: true, role: true } } },
        },
        approvals: true,
      },
    });
    if (!project) return fail(404, "Project not found");

    const isStaff =
      !!me && (me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN");
    const isClient = !!tokenCtx && tokenCtx.projectId === project.id;
    if (!isStaff && !isClient) return fail(403, "Forbidden");

    return ok({ project, viewer: viewerFor(me, isClient) });
  } catch (e) {
    return handleError(e);
  }
}

function viewerFor(me: { id: string; role: string } | null, isClient: boolean) {
  if (isClient && !me) return { kind: "client" as const };
  if (me) return { kind: "user" as const, id: me.id, role: me.role };
  return { kind: "anon" as const };
}
