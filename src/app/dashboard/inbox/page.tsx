import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClaimButton } from "@/components/ClaimButton";
import { formatMoney } from "@/lib/money";
import { Building2, Calendar, Inbox as InboxIcon, Link2, Mail, Phone, User, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!["DESIGNER", "CLIENT_MANAGER", "ADMIN"].includes(me.role)) redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: { status: "INCOMING" },
    include: {
      clientContact: true,
      order: { include: { addons: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <InboxIcon className="h-4 w-4" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          New orders placed via the public order page. Claim one to assign yourself and start the work.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <InboxIcon className="h-5 w-5" />
            </span>
            <CardTitle>No incoming orders right now</CardTitle>
            <CardSubtitle>
              Share the <Link href="/order" className="text-accent">public order page</Link> with prospective clients.
            </CardSubtitle>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <Badge variant="muted">{p.code}</Badge>
                  <Badge variant="accent">INCOMING</Badge>
                </div>
                <CardSubtitle className="mt-1 max-w-2xl">
                  {p.briefMd ? p.briefMd.slice(0, 200) + (p.briefMd.length > 200 ? "…" : "") : "No brief provided."}
                </CardSubtitle>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold tracking-tight">
                  {p.order ? formatMoney(p.order.totalMinor, p.order.currency) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <User className="h-3 w-3" /> Client
                </div>
                <div className="mt-2 space-y-1">
                  <div className="font-medium">{p.clientContact.name ?? p.clientContact.email}</div>
                  <ContactRow icon={<Mail className="h-3 w-3" />} value={p.clientContact.email} />
                  {p.clientContact.company ? <ContactRow icon={<Building2 className="h-3 w-3" />} value={p.clientContact.company} /> : null}
                  {p.clientContact.phone ? <ContactRow icon={<Phone className="h-3 w-3" />} value={p.clientContact.phone} /> : null}
                  {p.clientContact.website ? <ContactRow icon={<Link2 className="h-3 w-3" />} value={p.clientContact.website} /> : null}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Scope
                </div>
                <div className="mt-2 space-y-1">
                  {p.deadline ? (
                    <ContactRow icon={<Calendar className="h-3 w-3" />} value={`Deadline ${new Date(p.deadline).toLocaleDateString()}`} />
                  ) : null}
                  {p.budgetMinor ? (
                    <ContactRow icon={<Wallet className="h-3 w-3" />} value={`Budget ${formatMoney(p.budgetMinor, p.order?.currency ?? "INR")}`} />
                  ) : null}
                  {p.references.length > 0 ? (
                    <div className="space-y-0.5">
                      {p.references.slice(0, 3).map((r) => (
                        <ContactRow key={r} icon={<Link2 className="h-3 w-3" />} value={r} truncate />
                      ))}
                    </div>
                  ) : null}
                  {!p.deadline && !p.budgetMinor && p.references.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No scope details provided.</div>
                  ) : null}
                </div>
              </div>
            </div>

            {p.order ? (
              <div className="mt-3 rounded-xl border border-border p-3 text-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order</div>
                <div className="mt-1 font-medium">{p.order.packageNameSnapshot}</div>
                {p.order.addons.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.order.addons.map((a) => (
                      <span key={a.id} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {a.nameSnapshot}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ClaimButton projectId={p.id} role={me.role} />
              <Link href={`/dashboard/projects/${p.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                View details →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContactRow({ icon, value, truncate }: { icon: React.ReactNode; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="flex-shrink-0">{icon}</span>
      <span className={truncate ? "truncate" : ""}>{value}</span>
    </div>
  );
}
