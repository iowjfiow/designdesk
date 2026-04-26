export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/http";

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) return ok({ user: null });
    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        timezone: true,
        bio: true,
      },
    });
    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      timezone?: string;
      bio?: string;
    };
    const data: {
      name?: string | null;
      phone?: string | null;
      timezone?: string | null;
      bio?: string | null;
    } = {};
    if (body.name !== undefined) {
      const v = (body.name ?? "").trim();
      if (v && v.length > 80) return fail(400, "Name is too long");
      data.name = v || null;
    }
    if (body.phone !== undefined) {
      const v = (body.phone ?? "").trim();
      if (v.length > 40) return fail(400, "Phone is too long");
      data.phone = v || null;
    }
    if (body.timezone !== undefined) {
      const v = (body.timezone ?? "").trim();
      if (v.length > 80) return fail(400, "Timezone is too long");
      data.timezone = v || null;
    }
    if (body.bio !== undefined) {
      const v = (body.bio ?? "").trim();
      if (v.length > 2000) return fail(400, "Bio is too long");
      data.bio = v || null;
    }
    const user = await prisma.user.update({
      where: { id: me.id },
      data,
      select: { id: true, email: true, name: true, role: true, phone: true, timezone: true, bio: true },
    });
    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
