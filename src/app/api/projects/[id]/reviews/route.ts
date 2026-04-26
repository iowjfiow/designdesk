export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ReviewSchema } from "@/lib/validators";
import { ok, handleError, fail } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { resolveClientFromCookie } from "@/lib/client-token";
import { requireUser } from "@/lib/auth";

// GET — both authenticated parties (designer/manager) and the magic-link client
// can read reviews on the project.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");

    // Allow either a logged-in user assigned to the project, or the magic-link client.
    let allowed = false;
    try {
      const me = await requireUser();
      if (me.id === project.designerId || me.id === project.managerId || me.role === "ADMIN") {
        allowed = true;
      }
    } catch {
      // not logged in — fall through to client-token check
    }
    if (!allowed) {
      const client = await resolveClientFromCookie(req, id);
      if (client) allowed = true;
    }
    if (!allowed) return fail(403, "Not allowed");

    const reviews = await prisma.review.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: {
        clientContact: { select: { id: true, name: true, email: true } },
      },
    });
    return ok({ reviews });
  } catch (e) {
    return handleError(e);
  }
}

// POST — only the magic-link client can submit reviews.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");

    const client = await resolveClientFromCookie(req, id);
    if (!client) return fail(403, "Reviews can only be submitted by the project's client");

    const body = ReviewSchema.parse(await req.json());

    if (body.kind === "MILESTONE" && !body.milestoneId) {
      return fail(400, "milestoneId is required for milestone reviews");
    }
    if (body.kind === "FINAL") {
      if (!body.rating) return fail(400, "Final reviews require a 1–5 star rating");
      if (project.status !== "COMPLETED") {
        return fail(400, "Final review can only be left after the project is complete");
      }
    }

    if (body.milestoneId) {
      const m = await prisma.milestone.findUnique({ where: { id: body.milestoneId } });
      if (!m || m.projectId !== id) return fail(400, "Invalid milestone");
    }

    const review = await prisma.review.create({
      data: {
        projectId: id,
        milestoneId: body.milestoneId ?? null,
        clientContactId: client.id,
        kind: body.kind,
        rating: body.rating ?? null,
        comment: body.comment,
      },
    });

    await logActivity({
      actorId: null,
      projectId: id,
      action: body.kind === "FINAL" ? "review.final" : "review.milestone",
      metadata: { reviewId: review.id, rating: body.rating ?? null, milestoneId: body.milestoneId ?? null },
    });

    return ok({ review });
  } catch (e) {
    return handleError(e);
  }
}
