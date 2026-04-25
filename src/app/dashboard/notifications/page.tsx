import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";

export default async function NotificationsPage() {
  const me = await requireUser();
  const list = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <MarkAllReadButton />
      </div>
      <Card>
        {list.length === 0 ? (
          <CardSubtitle>No notifications yet.</CardSubtitle>
        ) : (
          <ul className="space-y-3">
            {list.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0">
                <div>
                  <CardTitle className="text-sm">{n.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  {n.href ? <Link href={n.href} className="text-xs text-accent">Open →</Link> : null}
                </div>
                <time className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
