import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { AccessTokenRole, ClientContact, ProjectAccessToken } from "@prisma/client";

const COOKIE_PREFIX = "dd_pat_";
const TOKEN_TTL_DAYS = 90;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueAccessToken(opts: {
  projectId: string;
  role?: AccessTokenRole;
  label?: string;
  expiresAt?: Date | null;
}): Promise<{ token: string; record: ProjectAccessToken }> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const record = await prisma.projectAccessToken.create({
    data: {
      projectId: opts.projectId,
      tokenHash,
      role: opts.role ?? "CLIENT",
      label: opts.label ?? null,
      expiresAt:
        opts.expiresAt === null
          ? null
          : opts.expiresAt ?? new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { token: raw, record };
}

export type ClientTokenContext = {
  projectId: string;
  clientContact: ClientContact | null;
  role: AccessTokenRole;
  tokenId: string;
};

export async function resolveAccessToken(raw: string): Promise<ClientTokenContext | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const record = await prisma.projectAccessToken.findUnique({
    where: { tokenHash },
    include: { project: { include: { clientContact: true } } },
  });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;
  await prisma.projectAccessToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    projectId: record.projectId,
    clientContact: record.project.clientContact,
    role: record.role,
    tokenId: record.id,
  };
}

export function clientCookieNameFor(projectId: string): string {
  return `${COOKIE_PREFIX}${projectId}`;
}

export async function persistClientCookie(projectId: string, token: string, expiresAt?: Date | null): Promise<void> {
  const jar = await cookies();
  jar.set(clientCookieNameFor(projectId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ?? new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  });
}

export async function readClientCookie(projectId: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(clientCookieNameFor(projectId))?.value ?? null;
}

export function buildMagicLinkPath(token: string): string {
  return `/p/${token}`;
}
