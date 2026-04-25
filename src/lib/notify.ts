import { prisma } from "@/lib/db";

export async function notify(
  userId: string,
  input: { title: string; body: string; href?: string },
) {
  // Persist in-app notification
  await prisma.notification.create({
    data: { userId, title: input.title, body: input.body, href: input.href },
  });
  // Email is stubbed — plug Resend / SES here.
  if (process.env.NODE_ENV !== "test") {
    console.log(`[notify:email-stub] -> ${userId}: ${input.title}`);
  }
}

export async function notifyMany(userIds: string[], input: { title: string; body: string; href?: string }) {
  await Promise.all(userIds.map((id) => notify(id, input)));
}
