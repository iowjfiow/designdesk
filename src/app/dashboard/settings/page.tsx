import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const me = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { id: true, email: true, name: true, role: true, phone: true, timezone: true, bio: true },
  });
  if (!user) throw new Error("User not found");
  return (
    <SettingsClient
      user={{
        email: user.email,
        name: user.name ?? "",
        role: user.role,
        phone: user.phone ?? "",
        timezone: user.timezone ?? "Asia/Kolkata",
        bio: user.bio ?? "",
      }}
    />
  );
}
