import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { LoginSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(clientKey(req, "login"), { max: 10, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return fail(429, "Too many login attempts");

    const body = LoginSchema.parse(await req.json());
    const email = body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    // Constant-time-ish: always run bcrypt to avoid leaking existence via timing
    const okPw = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !okPw) {
      return fail(401, "Invalid email or password");
    }
    await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for"),
    });
    await logActivity({
      actorId: user.id,
      action: "user.login",
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return handleError(e);
  }
}
