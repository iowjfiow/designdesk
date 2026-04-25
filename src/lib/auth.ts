import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE = "dd_session";
const SESSION_TTL_DAYS = 14;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function newToken(): { token: string; tokenHash: string } {
  // We store only the hash in the DB; the cookie holds the raw token.
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<string> {
  const { token, tokenHash } = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      token: tokenHash,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.session.deleteMany({ where: { token: tokenHash } });
  }
  jar.delete(SESSION_COOKIE);
}

export type AuthedUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "stripeAccountId" | "razorpayAccountId" | "payoutsEnabled"
>;

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    stripeAccountId: u.stripeAccountId,
    razorpayAccountId: u.razorpayAccountId,
    payoutsEnabled: u.payoutsEnabled,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "Authentication required");
  return u;
}

export async function requireRole(allowed: Role[]): Promise<AuthedUser> {
  const u = await requireUser();
  if (!allowed.includes(u.role)) {
    throw new HttpError(403, "Forbidden");
  }
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
