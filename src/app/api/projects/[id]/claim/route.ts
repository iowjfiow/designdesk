export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ClaimProjectSchema } from "@/lib/validators";
import { ok, handleError, fail } from "@/lib/http";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const me = await requireUser();
    if (!["DESIGNER", "CLIENT_MANAGER", "ADMIN"].includes(me.role)) {
      return fail(403, "Only designers and managers can claim incoming orders");
    }
    const body = ClaimProjectSchema.parse(await req.json().catch(() => ({})));

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    if (project.status !== "INCOMING") return fail(400, "Project is no longer in the inbox");

    let designerId: string | null = project.designerId;
    let managerId: string | null = project.managerId;

    if (me.role === "DESIGNER" || me.role === "ADMIN") {
      designerId = me.id;
      if (body.managerEmail) {
        const mgr = await prisma.user.findUnique({
          where: { email: body.managerEmail.toLowerCase() },
        });
        if (!mgr || (mgr.role !== "CLIENT_MANAGER" && mgr.role !== "ADMIN")) {
          return fail(400, `No Client Manager with email ${body.managerEmail.toLowerCase()} exists.`);
        }
        managerId = mgr.id;
      }
    } else {
      // CLIENT_MANAGER claiming
      managerId = me.id;
      if (body.designerEmail) {
        const designer = await prisma.user.findUnique({
          where: { email: body.designerEmail.toLowerCase() },
        });
        if (!designer || (designer.role !== "DESIGNER" && designer.role !== "ADMIN")) {
          return fail(400, `No Designer with email ${body.designerEmail.toLowerCase()} exists.`);
        }
        designerId = designer.id;
      }
    }

    if (!designerId) {
      return fail(400, "Designer must be assigned (provide designerEmail).");
    }

    const newMode = managerId ? "COLLAB" : "SOLO";

    const updated = await prisma.project.update({
      where: { id },
      data: {
        designerId,
        managerId,
        mode: newMode,
        status: "DRAFT",
      },
    });

    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "project.claimed",
      metadata: { designerId, managerId, claimedBy: me.role },
    });

    return ok({ project: updated });
  } catch (e) {
    return handleError(e);
  }
}
