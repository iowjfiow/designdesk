export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/validators";
import { ok, handleError, fail } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { projectCode } from "@/lib/code";
import { notifyMany } from "@/lib/notify";
import { randomBytes } from "node:crypto";

export async function GET() {
  try {
    const me = await requireUser();
    const projects = await prisma.project.findMany({
      where: {
        OR: [{ designerId: me.id }, { managerId: me.id }, { clientId: me.id }],
      },
      include: {
        designer: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
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

    // Only Designers (or Admins) can create projects directly. Client Managers
    // can create COLLAB projects on behalf of a designer/client.
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

    // Resolve / invite client
    const client = await upsertParty(body.clientEmail, body.clientName, "CLIENT");

    // Designer is `me` if I'm a designer, else the project must specify one
    // (in this MVP we keep it simple: designer == current user when designer/admin,
    // and if a CLIENT_MANAGER creates the project they must invite a designer
    // — we error here to keep the flow correct).
    let designerId: string;
    let managerId: string | null = null;
    if (me.role === "DESIGNER" || me.role === "ADMIN") {
      designerId = me.id;
      if (body.mode === "COLLAB" && body.managerEmail) {
        const mgr = await upsertParty(body.managerEmail, undefined, "CLIENT_MANAGER");
        managerId = mgr.id;
      }
    } else {
      // CLIENT_MANAGER: must designate a designer via managerEmail field reused?
      // For clarity we require the managerEmail to be the designer they collab with.
      // (Better: separate field — we'll treat managerEmail as the designer email here.)
      if (!body.managerEmail) return fail(400, "Specify the designer's email in managerEmail");
      const designer = await upsertParty(body.managerEmail, undefined, "DESIGNER");
      designerId = designer.id;
      managerId = me.id;
    }

    // Pricing
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
        clientId: client.id,
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

    await logActivity({
      actorId: me.id,
      projectId: project.id,
      action: "project.created",
      metadata: { mode: project.mode, total: totalMinor, currency: pkg.currency },
    });
    await notifyMany([client.id, designerId, ...(managerId ? [managerId] : [])].filter((x) => x !== me.id), {
      title: `New project: ${project.title}`,
      body: `You've been added to project ${project.code}.`,
      href: `/dashboard/projects/${project.id}`,
    });

    return ok({ project });
  } catch (e) {
    return handleError(e);
  }
}

async function upsertParty(email: string, name: string | undefined, role: "CLIENT" | "DESIGNER" | "CLIENT_MANAGER") {
  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return existing;
  // Invite-style: create a placeholder account with a random password.
  // The user will need to do "forgot password" to set one — that flow is a TODO.
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
