import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { resolveAccessToken, persistClientCookie } from "@/lib/client-token";
import { ClientPortal } from "@/components/ClientPortal";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await resolveAccessToken(token);
  if (!ctx) notFound();

  // Persist the token in an httpOnly cookie so subsequent fetches authenticate without
  // putting the raw token into the URL bar.
  await persistClientCookie(ctx.projectId, token);

  const project = await prisma.project.findUnique({
    where: { id: ctx.projectId },
    include: {
      designer: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
      clientContact: { select: { id: true, name: true, email: true, company: true, phone: true, website: true } },
      order: { include: { addons: true, payments: true } },
      milestones: { orderBy: { order: "asc" }, include: { deliverables: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          senderUser: { select: { id: true, name: true, role: true } },
          senderClient: { select: { id: true, name: true, email: true } },
        },
      },
      disputes: true,
    },
  });
  if (!project) redirect("/");

  const serializable = JSON.parse(JSON.stringify(project));
  return <ClientPortal project={serializable} />;
}
