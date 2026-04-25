export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const me = await requireUser();
    const list = await prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ notifications: list });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST() {
  // mark-all-read
  try {
    const me = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
