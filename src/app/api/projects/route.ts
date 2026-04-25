export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/validators";
import { ok, handleError, fail } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { projectCode } from "@/lib/code";
import { notifyMany } from "@/lib/notify";
import { issueAccessToken, buildMagicLinkPath } from "@/lib/client-token";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "node:crypto";

export async function GET() {
  try {
    const me = await requireUser();
    const projects = await prisma.project.findMany({
      where: {
        OR: [{ designerId: me.id }, { managerId: me.id }],
      },
      include: {
        designer: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        clientContact: { select: { id: true, name: true, email: true } },
        order: true,
        _count: { select: { messages: true, milestones: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ projects });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();

    if (!["DESIGNER", "ADMIN", "CLIENT_MANAGER"].includes(me.role)) {
      return fail(403, "Only designers, managers, or admins can create projects");
    }
    const body = CreateProjectSchema.parse(await req.json());

    if (body.mode === "COLLAB" && !body.managerEmail && me.role !== "CLIENT_MANAGER") {
      return fail(400, "Collab mode requires a Client Manager email");
    }
    if (body.mode === "SOLO" && body.managerEmail) {
      return fail(400, "Solo mode cannot have a manager");
    }

    // Resolve / create the magic-link client (no User row, no password).
    const clientContact = await upsertClientContact(body.clientEmail, body.clientName);

    let designerId: string;
    let managerId: string | null = null;
    if (me.role === "DESIGNER" || me.role === "ADMIN") {
      designerId = me.id;
      if (body.mode === "COLLAB" && body.managerEmail) {
        const mgr = await upsertCollaborator(body.managerEmail, undefined, "CLIENT_MANAGER");
        managerId = mgr.id;
      }
    } else {
      // CLIENT_MANAGER creating a project: managerEmail field carries the designer's email.
      if (!body.managerEmail) return fail(400, "Specify the designer's email in managerEmail");
      const designer = await upsertCollaborator(body.managerEmail, undefined, "DESIGNER");
      designerId = designer.id;
      managerId = me.id;
    }

    const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
    if (!pkg) return fail(400, "Unknown package");
    const addons = body.addonIds.length
      ? await prisma.addon.findMany({ where: { id: { in: body.addonIds }, active: true } })
      : [];
    if (addons.length !== body.addonIds.length) {
      return fail(400, "One or more add-ons are invalid");
    }
    const subtotalMinor =
      (body.customQuote && body.customAmountMinor != null
        ? body.customAmountMinor
        : pkg.priceMinor) + addons.reduce((s, a) => s + a.priceMinor, 0);
    const taxBps = body.taxBps;
    const taxMinor = Math.floor((subtotalMinor * taxBps) / 10_000);
    const totalMinor = subtotalMinor + taxMinor;

    const designerBps =
      body.mode === "SOLO"
        ? 10_000
        : body.designerBps ?? Number(process.env.COLLAB_DESIGNER_BPS ?? 6000);
    const managerBps =
      body.mode === "SOLO" ? 0 : body.managerBps ?? Number(process.env.COLLAB_MANAGER_BPS ?? 4000);
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? 0);

    if (designerBps + managerBps + platformFeeBps > 10_000) {
      return fail(400, "Split exceeds 100%");
    }

    const project = await prisma.project.create({
      data: {
        code: projectCode(),
        title: body.title,
        briefMd: body.briefMd ?? null,
        mode: body.mode,
        status: "DRAFT",
        designerId,
        managerId,
        clientContactId: clientContact.id,
        designerBps,
        managerBps,
        platformFeeBps,
        order: {
          create: {
            packageId: pkg.id,
            packageNameSnapshot: pkg.name,
            packagePriceMinor:
              body.customQuote && body.customAmountMinor != null
                ? body.customAmountMinor
                : pkg.priceMinor,
            currency: pkg.currency,
            taxBps,
            subtotalMinor,
            taxMinor,
            totalMinor,
            customQuote: body.customQuote,
            customNotes: body.customNotes ?? null,
            addons: {
              create: addons.map((a) => ({
                addonId: a.id,
                nameSnapshot: a.name,
                priceMinor: a.priceMinor,
              })),
            },
          },
        },
      },
      include: { order: { include: { addons: true } } },
    });

    // Issue a magic-link access token for the client and email it.
    const { token } = await issueAccessToken({
      projectId: project.id,
      role: "CLIENT",
      label: "client",
    });
    const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const magicLink = `${base}${buildMagicLinkPath(token)}`;
    await sendEmail({
      to: clientContact.email,
      subject: `Your project ${project.code} — ${project.title}`,
      bodyText: `Hi${clientContact.name ? " " + clientContact.name : ""},\n\nA new project has been started for you on DesignDesk.\nOpen it here (no signup needed): ${magicLink}\n\nThis link is private to you — do not share it.`,
    });

    await logActivity({
      actorId: me.id,
      projectId: project.id,
      action: "project.created",
      metadata: {
        mode: project.mode,
        total: totalMinor,
        currency: pkg.currency,
        clientEmail: clientContact.email,
      },
    });
    await notifyMany([designerId, ...(managerId ? [managerId] : [])].filter((x) => x !== me.id), {
      title: `New project: ${project.title}`,
      body: `You've been added to project ${project.code}.`,
      href: `/dashboard/projects/${project.id}`,
    });

    return ok({ project, magicLink });
  } catch (e) {
    return handleError(e);
  }
}

async function upsertClientContact(email: string, name?: string) {
  const lower = email.toLowerCase();
  return prisma.clientContact.upsert({
    where: { email: lower },
    update: name ? { name } : {},
    create: { email: lower, name: name ?? null },
  });
}

async function upsertCollaborator(
  email: string,
  name: string | undefined,
  role: "DESIGNER" | "CLIENT_MANAGER",
) {
  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return existing;
  // Invite-style placeholder account; the user will set a password via signup.
  const tempPw = randomBytes(24).toString("hex");
  return prisma.user.create({
    data: {
      email: lower,
      name: name ?? null,
      passwordHash: await hashPassword(tempPw),
      role,
    },
  });
}
