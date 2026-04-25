export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { SendMessageSchema } from "@/lib/validators";
import { messageHash } from "@/lib/chat-hash";
import { logActivity } from "@/lib/activity";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    if (![project.designerId, project.managerId, project.clientId].includes(me.id) && me.role !== "ADMIN") {
      return fail(403, "Forbidden");
    }
    const messages = await prisma.message.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    return ok({ messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const body = SendMessageSchema.parse(await req.json());
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    if (![project.designerId, project.managerId, project.clientId].includes(me.id)) {
      return fail(403, "Only project parties can chat");
    }
    const last = await prisma.message.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    const createdAt = new Date();
    const hash = messageHash({
      prevHash: last?.hash ?? null,
      senderId: me.id,
      body: body.body,
      createdAtIso: createdAt.toISOString(),
    });
    const msg = await prisma.message.create({
      data: {
        projectId: id,
        senderId: me.id,
        body: body.body,
        prevHash: last?.hash ?? null,
        hash,
        createdAt,
      },
    });
    await logActivity({ actorId: me.id, projectId: id, action: "message.sent" });
    return ok({ message: msg });
  } catch (e) {
    return handleError(e);
  }
}
