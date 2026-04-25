export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const me = await requireUser();
    const entries = await prisma.walletEntry.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { project: { select: { id: true, code: true, title: true, mode: true } } },
    });
    const summary = entries.reduce(
      (acc, e) => {
        if (e.state === "available") acc.available += e.amountMinor;
        else if (e.state === "pending") acc.pending += e.amountMinor;
        else if (e.state === "locked") acc.locked += e.amountMinor;
        return acc;
      },
      { available: 0, pending: 0, locked: 0 },
    );
    return ok({ summary, entries });
  } catch (e) {
    return handleError(e);
  }
}
