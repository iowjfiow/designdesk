import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const addons = await prisma.addon.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { priceMinor: "asc" }],
    });
    return ok({ addons });
  } catch (e) {
    return handleError(e);
  }
}
