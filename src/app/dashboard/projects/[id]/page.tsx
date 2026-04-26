import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      designer: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
      manager: { select: { id: true, name: true, email: true, stripeAccountId: true, payoutsEnabled: true } },
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
      accessTokens: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!project) notFound();
  if (![project.designerId, project.managerId].includes(me.id) && me.role !== "ADMIN") {
    notFound();
  }
  // Convert dates for client component
  const serializable = JSON.parse(JSON.stringify(project));
  return <ProjectWorkspace project={serializable} meId={me.id} />;
}
