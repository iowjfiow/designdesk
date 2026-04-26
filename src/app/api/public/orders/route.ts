export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { PublicOrderSchema } from "@/lib/validators";
import { ok, handleError, fail } from "@/lib/http";
import { logActivity } from "@/lib/activity";
import { projectCode } from "@/lib/code";
import { issueAccessToken, buildMagicLinkPath } from "@/lib/client-token";
import { sendEmail } from "@/lib/email";

// Public — no auth. Anyone can place an order; it lands in INCOMING for a
// designer or manager to claim from their Inbox.
export async function POST(req: NextRequest) {
  try {
    const reqOrigin = new URL(req.url).origin;
    const body = PublicOrderSchema.parse(await req.json());

    const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
    if (!pkg) return fail(400, "Unknown package");
    const addons = body.addonIds.length
      ? await prisma.addon.findMany({ where: { id: { in: body.addonIds }, active: true } })
      : [];
    if (addons.length !== body.addonIds.length) {
      return fail(400, "One or more add-ons are invalid");
    }

    const subtotalMinor = pkg.priceMinor + addons.reduce((s, a) => s + a.priceMinor, 0);
    const taxBps = body.taxBps;
    const taxMinor = Math.floor((subtotalMinor * taxBps) / 10_000);
    const totalMinor = subtotalMinor + taxMinor;

    const lower = body.clientEmail.toLowerCase();
    const clientContact = await prisma.clientContact.upsert({
      where: { email: lower },
      update: {
        name: body.clientName ?? undefined,
        company: body.clientCompany ?? undefined,
        phone: body.clientPhone ?? undefined,
        website: body.clientWebsite ?? undefined,
      },
      create: {
        email: lower,
        name: body.clientName ?? null,
        company: body.clientCompany ?? null,
        phone: body.clientPhone ?? null,
        website: body.clientWebsite ?? null,
      },
    });

    const project = await prisma.project.create({
      data: {
        code: projectCode(),
        title: body.title,
        briefMd: body.briefMd ?? null,
        mode: "COLLAB", // public orders default to COLLAB; manager can convert to SOLO on claim
        status: "INCOMING",
        designerId: null,
        managerId: null,
        clientContactId: clientContact.id,
        deadline: body.deadline ? new Date(body.deadline) : null,
        budgetMinor: body.budgetMinor ?? null,
        references: body.references,
        designerBps: 6000,
        managerBps: 4000,
        platformFeeBps: Number(process.env.PLATFORM_FEE_BPS ?? 0),
        order: {
          create: {
            packageId: pkg.id,
            packageNameSnapshot: pkg.name,
            packagePriceMinor: pkg.priceMinor,
            currency: pkg.currency,
            taxBps,
            subtotalMinor,
            taxMinor,
            totalMinor,
            customQuote: false,
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

    // Issue magic link for the client up-front so they can revisit the order.
    const { token } = await issueAccessToken({
      projectId: project.id,
      role: "CLIENT",
      label: "client",
    });
    const base = process.env.APP_BASE_URL || reqOrigin;
    const magicLink = `${base}${buildMagicLinkPath(token)}`;
    await sendEmail({
      to: clientContact.email,
      subject: `We received your order — ${project.code}`,
      bodyText: `Hi${clientContact.name ? " " + clientContact.name : ""},\n\nThanks for placing your order! A designer will pick it up shortly.\n\nView and chat about it here (no signup needed): ${magicLink}\n\nThis link is private to you — do not share it.`,
    });

    await logActivity({
      actorId: null,
      projectId: project.id,
      action: "project.public_order",
      metadata: {
        total: totalMinor,
        currency: pkg.currency,
        clientEmail: clientContact.email,
        company: body.clientCompany ?? null,
      },
    });

    return ok({ project, magicLink });
  } catch (e) {
    return handleError(e);
  }
}
