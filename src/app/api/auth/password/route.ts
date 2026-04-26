export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const cur = (body.currentPassword ?? "").trim();
    const next = (body.newPassword ?? "").trim();
    if (!cur) return fail(400, "Current password is required");
    if (next.length < 8) return fail(400, "New password must be at least 8 characters");
    if (next.length > 200) return fail(400, "New password is too long");

    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!user) return fail(404, "User not found");
    const okPw = await verifyPassword(cur, user.passwordHash);
    if (!okPw) return fail(401, "Current password is incorrect");
    if (await verifyPassword(next, user.passwordHash))
      return fail(409, "New password must be different from current password");

    const passwordHash = await hashPassword(next);
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash } });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
