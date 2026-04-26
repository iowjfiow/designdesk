export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError, fail } from "@/lib/http";

export async function GET() {
  try {
    const me = await requireUser();
    if (!["DESIGNER", "CLIENT_MANAGER", "ADMIN"].includes(me.role)) {
      return fail(403, "Not allowed");
    }
    const projects = await prisma.project.findMany({
      where: { status: "INCOMING" },
      include: {
        clientContact: {
          select: { id: true, name: true, email: true, company: true, phone: true, website: true },
        },
        order: { include: { addons: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ projects });
  } catch (e) {
    return handleError(e);
  }
}
