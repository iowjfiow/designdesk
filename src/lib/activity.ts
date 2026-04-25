import { prisma } from "@/lib/db";

export async function logActivity(input: {
  actorId?: string | null;
  projectId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return prisma.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      projectId: input.projectId ?? null,
      action: input.action,
      metadata: input.metadata ? (input.metadata as object) : undefined,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
