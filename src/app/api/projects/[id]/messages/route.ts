export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveAccessToken, readClientCookie } from "@/lib/client-token";
import { ok, fail, handleError } from "@/lib/http";
import { SendMessageSchema } from "@/lib/validators";
import { messageHash } from "@/lib/chat-hash";
import { logActivity } from "@/lib/activity";

async function authoriseChat(req: Request, projectId: string) {
  const me = await getCurrentUser();
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("t");
  const tokenFromCookie = await readClientCookie(projectId);
  const tokenCtx = await resolveAccessToken(tokenFromQuery ?? tokenFromCookie ?? "");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { clientContact: true },
  });
  if (!project) return { ok: false as const, status: 404, message: "Project not found" };

  const isStaff = !!me && (me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN");
  const isClient = !!tokenCtx && tokenCtx.projectId === project.id && tokenCtx.role === "CLIENT";

  if (!isStaff && !isClient) return { ok: false as const, status: 403, message: "Forbidden" };

  return { ok: true as const, project, me, isClient };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authoriseChat(req, id);
    if (!auth.ok) return fail(auth.status, auth.message);
    const messages = await prisma.message.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
      include: {
        senderUser: { select: { id: true, name: true, role: true } },
        senderClient: { select: { id: true, name: true, email: true } },
      },
    });
    return ok({ messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = SendMessageSchema.parse(await req.json());
    const auth = await authoriseChat(req, id);
    if (!auth.ok) return fail(auth.status, auth.message);

    const last = await prisma.message.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    const createdAt = new Date();
    let senderUserId: string | null = null;
    let senderClientContactId: string | null = null;
    let senderName = "";
    let actorId: string | null = null;
    let chainKey = "";

    if (auth.isClient) {
      senderClientContactId = auth.project.clientContactId;
      senderName = auth.project.clientContact.name ?? auth.project.clientContact.email;
      chainKey = `client:${senderClientContactId}`;
    } else {
      senderUserId = auth.me!.id;
      senderName = auth.me!.name ?? auth.me!.email;
      actorId = auth.me!.id;
      chainKey = `user:${senderUserId}`;
    }

    const hash = messageHash({
      prevHash: last?.hash ?? null,
      senderId: chainKey,
      body: body.body,
      createdAtIso: createdAt.toISOString(),
    });

    const msg = await prisma.message.create({
      data: {
        projectId: id,
        senderUserId,
        senderClientContactId,
        senderName,
        body: body.body,
        prevHash: last?.hash ?? null,
        hash,
        createdAt,
      },
    });
    await logActivity({ actorId, projectId: id, action: "message.sent" });
    return ok({ message: msg });
  } catch (e) {
    return handleError(e);
  }
}
