import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";

export default async function ProjectsPage() {
  const me = await requireUser();
  const projects = await prisma.project.findMany({
    where: { OR: [{ designerId: me.id }, { managerId: me.id }, { clientId: me.id }] },
    orderBy: { updatedAt: "desc" },
    include: { order: true, designer: true, client: true, manager: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Link href="/dashboard/projects/new"><Button variant="accent">New project</Button></Link>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="surface flex items-center justify-between p-4 hover:bg-muted/40"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant={p.mode === "SOLO" ? "muted" : "accent"}>{p.mode}</Badge>
                  <Badge>{p.status.replace("_", " ")}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.code} · client {p.client.email} · designer {p.designer.email}
                  {p.manager ? ` · manager ${p.manager.email}` : ""}
                </div>
              </div>
              <div className="text-right text-sm">
                {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
