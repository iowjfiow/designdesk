import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { priceMinor: "asc" },
    });
    return ok({ packages });
  } catch (e) {
    return handleError(e);
  }
}
