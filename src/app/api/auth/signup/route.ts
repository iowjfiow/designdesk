import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { SignupSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(clientKey(req, "signup"), { max: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return fail(429, "Too many signup attempts");

    const body = SignupSchema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return fail(409, "Email already registered");

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        role: body.role,
      },
    });
    await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for"),
    });
    await logActivity({
      actorId: user.id,
      action: "user.signup",
      metadata: { role: user.role },
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return handleError(e);
  }
}
