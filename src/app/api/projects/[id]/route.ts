export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        designer: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
        manager: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
        client: { select: { id: true, name: true, email: true } },
        order: { include: { addons: true, payments: true } },
        milestones: { orderBy: { order: "asc" }, include: { deliverables: true } },
        deliverables: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, role: true } } } },
        disputes: true,
        activityLogs: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { id: true, name: true, role: true } } } },
        approvals: true,
      },
    });
    if (!project) return fail(404, "Project not found");
    if (![project.designerId, project.managerId, project.clientId].includes(me.id) && me.role !== "ADMIN") {
      return fail(403, "Forbidden");
    }
    return ok({ project });
  } catch (e) {
    return handleError(e);
  }
}
