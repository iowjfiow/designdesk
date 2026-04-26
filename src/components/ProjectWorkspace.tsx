"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clipboard,
  Copy,
  Globe,
  KeyRound,
  Link2,
  MessageSquare,
  Phone,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderName: string;
  senderUser: { id: string; name: string | null; role: string } | null;
  senderClient: { id: string; name: string | null; email: string } | null;
};

type ProjectDetail = {
  id: string;
  code: string;
  title: string;
  briefMd: string | null;
  mode: "SOLO" | "COLLAB";
  status: string;
  archivedAt: string | null;
  designerId: string | null;
  managerId: string | null;
  clientContactId: string;
  deadline: string | null;
  budgetMinor: number | null;
  references: string[];
  designerBps: number;
  managerBps: number;
  designerApprovedAt: string | null;
  managerApprovedAt: string | null;
  designer: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean } | null;
  manager: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean } | null;
  clientContact: { id: string; name: string | null; email: string; company: string | null; phone: string | null; website: string | null };
  order: {
    id: string;
    locked: boolean;
    lockedAt: string | null;
    packageNameSnapshot: string;
    packagePriceMinor: number;
    currency: string;
    taxBps: number;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    addons: { id: string; nameSnapshot: string; priceMinor: number }[];
    payments: { id: string; status: string; providerIntentId: string | null; clientSecret: string | null; amountMinor: number; releasedMinor: number }[];
  } | null;
  milestones: {
    id: string;
    kind: string;
    title: string;
    releaseBps: number;
    amountMinor: number;
    status: string;
    order: number;
    deliverables: { id: string; filename: string; version: number; sizeBytes: number; createdAt: string }[];
  }[];
  messages: Message[];
  disputes: { id: string; reason: string; status: string }[];
  accessTokens?: { id: string; label: string | null; createdAt: string }[];
  activityLogs: { id: string; action: string; createdAt: string; actor: { id: string; name: string | null; role: string } | null; metadata: unknown }[];
};

export function ProjectWorkspace({ project, meId, meRole }: { project: ProjectDetail; meId: string; meRole: string }) {
  const isAdmin = meRole === "ADMIN";
  const router = useRouter();
  const isDesigner = project.designerId === meId;
  const isManager = project.managerId === meId;
  const order = project.order;
  const payment = order?.payments.find(
    (p) =>
      p.status === "CAPTURED" ||
      p.status === "PARTIALLY_RELEASED" ||
      p.status === "REQUIRES_PAYMENT" ||
      p.status === "PROCESSING",
  );

  const refresh = () => router.refresh();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  async function call(action: string, url: string, init?: RequestInit) {
    setBusy(action);
    setErr(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, ...init });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Request failed");
      refresh();
      return j;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function reissueMagicLink() {
    setBusy("magic");
    setErr(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to issue link");
      setMagicLink(j.magicLink);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const requiresManager = project.mode === "COLLAB" && !!project.managerId;
  const designerApproved = !!project.designerApprovedAt;
  const managerApproved = !!project.managerApprovedAt;
  const fullyApproved = designerApproved && (!requiresManager || managerApproved);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {project.code}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={project.mode === "SOLO" ? "muted" : "accent"}>{project.mode}</Badge>
            <StatusPill status={project.status} />
            <span className="text-muted-foreground">
              · client {project.clientContact.email}
            </span>
          </div>
        </div>
        {project.status === "DISPUTED" ? (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <ShieldAlert className="h-4 w-4" />
            <span>Disputed — escrow frozen</span>
          </div>
        ) : null}
      </div>

      {err ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          {err}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <CardTitle>Workflow</CardTitle>
            </div>
            <CardSubtitle className="mt-1">Pricing freezes only after both parties approve.</CardSubtitle>
            <ol className="mt-4 space-y-3 text-sm">
              <Step
                done={designerApproved}
                active={!designerApproved && !order?.locked}
                label={`Designer approval${requiresManager ? "" : " (sole approver in SOLO)"}`}
                action={
                  isDesigner && !designerApproved && !order?.locked ? (
                    <Button size="sm" loading={busy === "lock"} onClick={() => call("lock", `/api/projects/${project.id}/lock`)}>
                      Approve scope
                    </Button>
                  ) : designerApproved ? (
                    <Badge variant="success">Approved</Badge>
                  ) : null
                }
              />
              {requiresManager ? (
                <Step
                  done={managerApproved}
                  active={!managerApproved && !order?.locked}
                  label="Client Manager approval"
                  action={
                    isManager && !managerApproved && !order?.locked ? (
                      <Button size="sm" loading={busy === "lock"} onClick={() => call("lock", `/api/projects/${project.id}/lock`)}>
                        Approve scope
                      </Button>
                    ) : managerApproved ? (
                      <Badge variant="success">Approved</Badge>
                    ) : null
                  }
                />
              ) : null}
              <Step
                done={fullyApproved && (order?.locked ?? false)}
                active={fullyApproved && !order?.locked}
                label="Order locked"
                action={
                  fullyApproved && !order?.locked ? (
                    <Badge variant="warning">Auto-locks on full approval</Badge>
                  ) : null
                }
              />
              <Step
                done={!!payment && payment.status !== "REQUIRES_PAYMENT" && payment.status !== "PROCESSING"}
                active={
                  !!order?.locked &&
                  (!payment || payment.status === "REQUIRES_PAYMENT" || payment.status === "PROCESSING")
                }
                label="Escrow funded"
                action={
                  payment && payment.status === "PROCESSING" ? (
                    <Badge variant="warning">Processing</Badge>
                  ) : order?.locked ? (
                    <Badge variant="muted">Client pays via magic-link</Badge>
                  ) : null
                }
              />
              <Step
                done={["IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED", "COMPLETED"].includes(project.status)}
                active={project.status === "PAID"}
                label="Designer accepted"
                action={
                  isDesigner && project.status === "PAID" ? (
                    <Button size="sm" loading={busy === "accept"} onClick={() => call("accept", `/api/projects/${project.id}/accept`)}>
                      Accept order
                    </Button>
                  ) : null
                }
              />
            </ol>
          </Card>

          <Card>
            <CardTitle>Milestones</CardTitle>
            <CardSubtitle>Funds release as the client approves each milestone.</CardSubtitle>
            {project.milestones.length > 0 ? (
              <MilestoneProgress milestones={project.milestones} />
            ) : null}
            <div className="mt-4 space-y-3">
              {project.milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  m={m}
                  currency={order?.currency ?? "INR"}
                  isDesigner={isDesigner}
                  projectId={project.id}
                  onChanged={refresh}
                  disabled={project.status === "DISPUTED"}
                />
              ))}
              {project.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Milestones generate automatically when both parties approve the scope.</p>
              ) : null}
            </div>
          </Card>

          <ChatPanel projectId={project.id} initial={project.messages} />

          <Card>
            <CardTitle>Activity log</CardTitle>
            <CardSubtitle>Tamper-evident audit of every action.</CardSubtitle>
            <ul className="mt-3 max-h-72 space-y-1 overflow-auto pretty-scroll pr-1 text-xs text-muted-foreground">
              {project.activityLogs.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-muted/40">
                  <span>
                    <span className="font-medium text-foreground">{a.actor?.name ?? a.actor?.role ?? "system"}</span>{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{a.action}</code>
                  </span>
                  <time>{new Date(a.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardTitle>Order</CardTitle>
            {order ? (
              <div className="mt-3 space-y-1 text-sm">
                <Row label={order.packageNameSnapshot} value={formatMoney(order.packagePriceMinor, order.currency)} />
                {order.addons.map((a) => (
                  <Row key={a.id} label={a.nameSnapshot} value={`+${formatMoney(a.priceMinor, order.currency)}`} />
                ))}
                <Divider />
                <Row label="Subtotal" value={formatMoney(order.subtotalMinor, order.currency)} />
                <Row label={`Tax (${(order.taxBps / 100).toFixed(0)}%)`} value={formatMoney(order.taxMinor, order.currency)} />
                <Divider />
                <Row label={<strong>Total</strong>} value={<strong>{formatMoney(order.totalMinor, order.currency)}</strong>} />
                <div className="mt-2 text-xs text-muted-foreground">
                  {order.locked ? `Locked ${new Date(order.lockedAt!).toLocaleString()}` : "Not yet locked"}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No order.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <CardTitle>Parties</CardTitle>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <PartyRow role="Client" name={project.clientContact.name ?? project.clientContact.email} sub={project.clientContact.email} accent="client" />
              {project.designer ? (
                <PartyRow role="Designer" name={project.designer.name ?? project.designer.email} sub={project.designer.email} accent="designer" />
              ) : (
                <PartyRow role="Designer" name="unclaimed" sub="—" accent="designer" />
              )}
              {project.manager ? (
                <PartyRow role="Manager" name={project.manager.name ?? project.manager.email} sub={project.manager.email} accent="manager" />
              ) : null}
            </ul>
            {project.mode === "COLLAB" ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3 text-accent" />
                Split: <strong className="text-foreground">Designer {(project.designerBps / 100).toFixed(0)}%</strong> / <strong className="text-foreground">Manager {(project.managerBps / 100).toFixed(0)}%</strong>
              </div>
            ) : null}
          </Card>

          <ProjectInfoCard project={project} />

          <Card>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              <CardTitle>Client magic-link</CardTitle>
            </div>
            <CardSubtitle className="mt-1">
              Generated once when the order is placed and emailed automatically. Valid until the project is completed.
            </CardSubtitle>
            <div className="mt-3 space-y-2 text-sm">
              {magicLink ? (
                <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-2">
                  <code className="flex-1 break-all text-xs text-foreground">{magicLink}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(magicLink)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sent to <strong>{project.clientContact.email}</strong>. Designers and managers can&apos;t change or reissue the link — ask an admin in genuine emergencies (lost email, leaked link).
                </p>
              )}
              {isAdmin && (
                <Button size="sm" variant="outline" className="w-full" loading={busy === "magic"} onClick={reissueMagicLink}>
                  <Clipboard className="h-3.5 w-3.5" />
                  Emergency reissue (admin)
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <CardTitle>Dispute</CardTitle>
            </div>
            {project.status === "DISPUTED" && project.disputes.length > 0 ? (
              <div className="mt-2 space-y-3">
                <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" /> Dispute open — escrow frozen
                  </div>
                  {project.disputes[0]?.reason ? (
                    <p className="mt-1 text-foreground/80">&ldquo;{project.disputes[0].reason}&rdquo;</p>
                  ) : null}
                </div>
                {(isDesigner || isManager || isAdmin) ? (
                  <ResolveDisputeButton projectId={project.id} onResolved={() => router.refresh()} />
                ) : null}
              </div>
            ) : project.status === "COMPLETED" ? (
              <CardSubtitle>Project completed — no disputes can be raised.</CardSubtitle>
            ) : (
              <DisputeForm projectId={project.id} />
            )}
          </Card>

          {project.status === "COMPLETED" && (isDesigner || isManager || isAdmin) ? (
            <Card>
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-accent" />
                <CardTitle>Archive</CardTitle>
              </div>
              <CardSubtitle className="mt-1">
                {project.archivedAt
                  ? `Archived on ${new Date(project.archivedAt).toLocaleDateString()}.`
                  : "Project is complete. Archive it to clean up your active list."}
              </CardSubtitle>
              <ArchiveButton projectId={project.id} archived={!!project.archivedAt} onChanged={() => router.refresh()} />
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Step({ done, active, label, action }: { done: boolean; active: boolean; label: string; action: React.ReactNode }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
        active
          ? "border-accent/40 bg-accent/5"
          : done
            ? "border-success/30 bg-success/5"
            : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
            done
              ? "bg-success text-white"
              : active
                ? "accent-gradient text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
        </span>
        <span className={`text-sm ${done || active ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
      </div>
      <div>{action}</div>
    </li>
  );
}

function MilestoneProgress({ milestones }: { milestones: ProjectDetail["milestones"] }) {
  const total = milestones.reduce((s, m) => s + m.amountMinor, 0);
  const released = milestones
    .filter((m) => m.status === "APPROVED")
    .reduce((s, m) => s + m.amountMinor, 0);
  const pct = total === 0 ? 0 : Math.round((released / total) * 100);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Released</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full accent-gradient transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PartyRow({
  role,
  name,
  sub,
  accent,
}: {
  role: string;
  name: string;
  sub: string;
  accent: "client" | "designer" | "manager";
}) {
  const tone =
    accent === "designer"
      ? "accent-gradient text-white"
      : accent === "manager"
        ? "bg-warning/15 text-warning"
        : "bg-success/15 text-success";
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${tone}`}>
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {role} {role !== name ? `· ${sub}` : null}
        </div>
      </div>
    </li>
  );
}

function MilestoneRow({
  m,
  currency,
  isDesigner,
  projectId,
  onChanged,
  disabled,
}: {
  m: ProjectDetail["milestones"][number];
  currency: string;
  isDesigner: boolean;
  projectId: string;
  onChanged: () => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function go(action: string, url: string, body?: object) {
    setBusy(action);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Failed");
      } else {
        onChanged();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border p-3 transition-colors hover:border-border-strong">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.title}</span>
            <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {m.kind} · {(m.releaseBps / 100).toFixed(0)}% ·{" "}
            <span className="font-medium text-foreground">{formatMoney(m.amountMinor, currency)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDesigner && (m.status === "IN_PROGRESS" || m.status === "REJECTED" || m.status === "PENDING") && !disabled ? (
            <DeliverableUploader projectId={projectId} milestoneId={m.id} onUploaded={onChanged} />
          ) : null}
          {isDesigner && (m.status === "IN_PROGRESS" || m.status === "REJECTED") && m.deliverables.length > 0 && !disabled ? (
            <Button
              size="sm"
              variant="accent"
              loading={busy === "submit"}
              onClick={() => go("submit", `/api/projects/${projectId}/milestones/${m.id}/submit`, {})}
            >
              <Send className="h-3.5 w-3.5" />
              Submit
            </Button>
          ) : null}
        </div>
      </div>
      {m.deliverables.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {m.deliverables.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="chip">v{d.version}</span>
              <span className="truncate font-medium text-foreground">{d.filename}</span>
              <span>{(d.sizeBytes / 1024).toFixed(0)} KB</span>
              <span className="ml-auto">{new Date(d.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function statusVariant(s: string): "default" | "success" | "warning" | "danger" | "muted" | "accent" {
  if (s === "APPROVED") return "success";
  if (s === "SUBMITTED") return "warning";
  if (s === "REJECTED") return "danger";
  if (s === "DISPUTED") return "danger";
  if (s === "IN_PROGRESS") return "accent";
  return "muted";
}

function DeliverableUploader({ projectId, milestoneId, onUploaded }: { projectId: string; milestoneId: string; onUploaded: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("milestoneId", milestoneId);
      const res = await fetch(`/api/projects/${projectId}/deliverables`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Upload failed");
      } else onUploaded();
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={onFile} />
      <Button size="sm" variant="outline" loading={uploading} onClick={() => ref.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        Upload
      </Button>
    </>
  );
}

function ResolveDisputeButton({ projectId, onResolved }: { projectId: string; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/dispute/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolutionNotes: notes.trim() || undefined }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Could not resolve");
      setOpen(false);
      setNotes("");
      onResolved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!open) {
    return (
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
        <ShieldCheck className="h-3.5 w-3.5" />
        Mark dispute resolved
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional resolution notes — what was agreed?"
        rows={3}
      />
      {err ? <div className="text-xs text-danger">{err}</div> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" variant="accent" loading={busy} onClick={go}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm resolved
        </Button>
      </div>
    </div>
  );
}

function ArchiveButton({
  projectId,
  archived,
  onChanged,
}: {
  projectId: string;
  archived: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/archive`, {
        method: archived ? "DELETE" : "POST",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Failed");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2">
      <Button size="sm" variant={archived ? "outline" : "accent"} loading={busy} onClick={toggle}>
        {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        {archived ? "Restore project" : "Archive project"}
      </Button>
      {err ? <div className="text-xs text-danger">{err}</div> : null}
    </div>
  );
}

function ChatPanel({ projectId, initial }: { projectId: string; initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  // keep the chat in sync with router refreshes
  useEffect(() => setMessages(initial), [initial]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error ?? "Failed");
        return;
      }
      const refreshed = await fetch(`/api/projects/${projectId}/messages`).then((r) => r.json());
      setMessages(refreshed.messages);
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-accent" />
        <CardTitle>Conversation</CardTitle>
      </div>
      <CardSubtitle className="mt-1">Hash-chained, immutable, retained for audit.</CardSubtitle>
      <div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-sm pretty-scroll">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <MessageSquare className="mb-2 h-5 w-5" />
            <span className="text-xs">No messages yet — start the conversation.</span>
          </div>
        ) : null}
        {messages.map((m) => {
          const isClient = !!m.senderClient;
          return (
            <div key={m.id} className="flex items-start gap-2">
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                  isClient ? "bg-success/15 text-success" : "accent-gradient text-white"
                }`}
                title={m.senderName}
              >
                {m.senderName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 rounded-lg bg-card p-2 hairline">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.senderName}</span>
                  {isClient ? <Badge variant="success">client</Badge> : null}
                  <span className="ml-auto">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={send} loading={sending} variant="accent">
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Tip: ⌘/Ctrl + Enter to send</p>
    </Card>
  );
}

function DisputeForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tooShort = reason.trim().length < 10;
  return (
    <div className="mt-3 space-y-2">
      <CardSubtitle>Tell us what&apos;s wrong. Escrow will freeze immediately and an admin will mediate.</CardSubtitle>
      <Textarea
        rows={3}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (err) setErr(null);
        }}
        placeholder="Describe the issue — what's wrong, what you expected, any timeline."
      />
      <div className="text-xs text-muted-foreground">
        <span className={tooShort ? "" : "text-success"}>{reason.trim().length}/10 minimum</span>
      </div>
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      <Button
        size="sm"
        variant="danger"
        className="w-full"
        loading={busy}
        disabled={tooShort}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const r = await fetch(`/api/projects/${projectId}/dispute`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          setBusy(false);
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            setErr(j.error ?? "Failed to raise dispute");
            return;
          }
          router.refresh();
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Raise dispute & freeze escrow
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Divider() {
  return <hr className="my-2 border-border" />;
}

function ProjectInfoCard({ project }: { project: ProjectDetail }) {
  const c = project.clientContact;
  const hasContact = c.company || c.phone || c.website;
  const hasScope = project.deadline || project.budgetMinor || project.references.length > 0;
  const hasBrief = project.briefMd && project.briefMd.trim().length > 0;
  if (!hasContact && !hasScope && !hasBrief) return null;
  const currency = project.order?.currency ?? "INR";
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-accent" />
        <CardTitle>Project info</CardTitle>
      </div>
      <CardSubtitle className="mt-1">Everything the client shared.</CardSubtitle>
      <div className="mt-3 space-y-3 text-sm">
        {hasBrief ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brief</div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {project.briefMd}
            </p>
          </div>
        ) : null}
        {hasContact ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</div>
            <ul className="mt-1 space-y-1">
              {c.company ? <InfoRow icon={<Building2 className="h-3 w-3" />} value={c.company} /> : null}
              {c.phone ? <InfoRow icon={<Phone className="h-3 w-3" />} value={c.phone} /> : null}
              {c.website ? (
                <InfoRow
                  icon={<Globe className="h-3 w-3" />}
                  value={
                    <a className="text-accent hover:underline" href={c.website} target="_blank" rel="noreferrer">
                      {c.website}
                    </a>
                  }
                />
              ) : null}
            </ul>
          </div>
        ) : null}
        {hasScope ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scope</div>
            <ul className="mt-1 space-y-1">
              {project.deadline ? (
                <InfoRow icon={<Calendar className="h-3 w-3" />} value={`Deadline ${new Date(project.deadline).toLocaleDateString()}`} />
              ) : null}
              {project.budgetMinor ? (
                <InfoRow icon={<Wallet className="h-3 w-3" />} value={`Budget ${formatMoney(project.budgetMinor, currency)}`} />
              ) : null}
              {project.references.length > 0 ? (
                <li className="space-y-0.5">
                  {project.references.map((r) => (
                    <InfoRow
                      key={r}
                      icon={<Link2 className="h-3 w-3" />}
                      value={
                        r.startsWith("http") ? (
                          <a className="break-all text-accent hover:underline" href={r} target="_blank" rel="noreferrer">
                            {r}
                          </a>
                        ) : (
                          <span className="break-all">{r}</span>
                        )
                      }
                    />
                  ))}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 text-foreground">{value}</span>
    </li>
  );
}
