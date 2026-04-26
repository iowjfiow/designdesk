export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { issueAccessToken, buildMagicLinkPath } from "@/lib/client-token";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";

/**
 * Emergency magic-link reissue.
 *
 * Per project policy, the client's magic-link is generated **once** when the
 * project is created and is the only valid link until the project is marked
 * COMPLETED. This endpoint exists for genuine emergencies (lost email, leaked
 * link, etc.) and is **admin only**. It revokes every previous token for the
 * project before issuing a fresh one and emails the new link to the client.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    if (me.role !== "ADMIN") {
      return fail(
        403,
        "Magic-links cannot be reissued by designers or managers. Ask an admin to reissue in case of emergency.",
      );
    }
    const project = await prisma.project.findUnique({
      where: { id },
      include: { clientContact: true },
    });
    if (!project) return fail(404, "Project not found");
    if (project.status === "COMPLETED") {
      return fail(409, "Project is completed — magic-link is closed.");
    }

    // Revoke all existing tokens before issuing a new one.
    await prisma.projectAccessToken.updateMany({
      where: { projectId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const { token } = await issueAccessToken({ projectId: id, role: "CLIENT", label: "client" });
    const origin = new URL(req.url).origin;
    const base = process.env.APP_BASE_URL || origin;
    const magicLink = `${base}${buildMagicLinkPath(token)}`;

    if (project.clientContact?.email) {
      await sendEmail({
        to: project.clientContact.email,
        subject: `New access link for project ${project.code}`,
        bodyText: `Hi${project.clientContact.name ? " " + project.clientContact.name : ""},\n\nAn admin has issued a fresh access link for your project ${project.code} — ${project.title}.\n\nOpen it here (no signup needed): ${magicLink}\n\nThis link replaces any earlier link. Keep it private.`,
      });
    }

    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "access.token_reissued_emergency",
      metadata: { reason: "admin emergency reissue" },
    });
    return ok({ magicLink });
  } catch (e) {
    return handleError(e);
  }
}
