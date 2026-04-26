export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { storeFile } from "@/lib/upload";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found");
    if (project.designerId !== me.id && me.role !== "ADMIN") {
      return fail(403, "Only the designer can upload deliverables");
    }
    const form = await req.formData();
    const file = form.get("file");
    const milestoneId = String(form.get("milestoneId") ?? "");
    const notes = String(form.get("notes") ?? "");
    if (!(file instanceof File)) return fail(400, "Missing file");
    if (!milestoneId) return fail(400, "Missing milestoneId");

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId: id },
    });
    if (!milestone) return fail(404, "Milestone not found");
    // Once the client has approved a milestone, files are locked. Designers
    // can re-upload (creating a new version) up until that approval.
    if (milestone.status === "APPROVED") {
      return fail(409, "Files are locked — the client already approved this milestone.");
    }
    if (project.archivedAt) return fail(409, "Project is archived");

    const stored = await storeFile(`projects/${id}/${milestoneId}`, file);

    const lastVersion = await prisma.deliverable.findFirst({
      where: { projectId: id, milestoneId },
      orderBy: { version: "desc" },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const deliv = await prisma.deliverable.create({
      data: {
        projectId: id,
        milestoneId,
        version,
        filename: stored.filename,
        storagePath: stored.storagePath,
        mimetype: stored.mimetype,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        scannedClean: stored.scannedClean,
        uploadedById: me.id,
        notes: notes || null,
      },
    });
    await logActivity({
      actorId: me.id,
      projectId: id,
      action: "deliverable.uploaded",
      metadata: { milestoneId, version, sha256: stored.sha256 },
    });
    return ok({ deliverable: deliv });
  } catch (e) {
    return handleError(e);
  }
}
