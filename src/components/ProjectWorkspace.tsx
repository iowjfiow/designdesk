"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";

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
  mode: "SOLO" | "COLLAB";
  status: string;
  designerId: string;
  managerId: string | null;
  clientContactId: string;
  designerBps: number;
  managerBps: number;
  designerApprovedAt: string | null;
  managerApprovedAt: string | null;
  designer: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean };
  manager: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean } | null;
  clientContact: { id: string; name: string | null; email: string };
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

export function ProjectWorkspace({ project, meId }: { project: ProjectDetail; meId: string }) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            {project.code} ·{" "}
            <Badge variant={project.mode === "SOLO" ? "muted" : "accent"}>{project.mode}</Badge>{" "}
            <Badge>{project.status.replace(/_/g, " ")}</Badge>
          </p>
        </div>
        {project.status === "DISPUTED" ? (
          <Badge variant="danger">Disputed — escrow frozen</Badge>
        ) : null}
      </div>

      {err ? (
        <Card className="border-danger text-danger">
          <CardSubtitle>{err}</CardSubtitle>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Workflow</CardTitle>
            <CardSubtitle>Pricing freezes only after both parties approve.</CardSubtitle>
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
            <ul className="mt-3 max-h-72 space-y-1 overflow-auto text-xs text-muted-foreground">
              {project.activityLogs.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="text-foreground">{a.actor?.name ?? a.actor?.role ?? "system"}</span>{" "}
                    <span>{a.action}</span>
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
            <CardTitle>Parties</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <strong>Client:</strong> {project.clientContact.name ?? project.clientContact.email}
              </li>
              <li>
                <strong>Designer:</strong> {project.designer.name ?? project.designer.email}
              </li>
              {project.manager ? (
                <li>
                  <strong>Manager:</strong> {project.manager.name ?? project.manager.email}
                </li>
              ) : null}
            </ul>
            {project.mode === "COLLAB" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Split: Designer {(project.designerBps / 100).toFixed(0)}% / Manager{" "}
                {(project.managerBps / 100).toFixed(0)}%
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Client magic-link</CardTitle>
            <CardSubtitle>Clients access this project via a private link — no signup required.</CardSubtitle>
            <div className="mt-3 space-y-2 text-sm">
              {magicLink ? (
                <div className="break-all rounded-md border border-border bg-muted/30 p-2 text-xs">{magicLink}</div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We emailed the link to <strong>{project.clientContact.email}</strong>. Re-issue if it was lost.
                </p>
              )}
              <Button size="sm" variant="outline" loading={busy === "magic"} onClick={reissueMagicLink}>
                {magicLink ? "Issue another link" : "Re-issue magic link"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Dispute</CardTitle>
            {project.disputes.length > 0 ? (
              <CardSubtitle>An active dispute is in progress.</CardSubtitle>
            ) : project.status === "COMPLETED" ? (
              <CardSubtitle>Project completed — no disputes can be raised.</CardSubtitle>
            ) : (
              <DisputeForm projectId={project.id} />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Step({ done, active, label, action }: { done: boolean; active: boolean; label: string; action: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
            done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? "✓" : active ? "●" : "○"}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div>{action}</div>
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
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.title}</span>
            <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {m.kind} · {(m.releaseBps / 100).toFixed(0)}% · {formatMoney(m.amountMinor, currency)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDesigner && (m.status === "IN_PROGRESS" || m.status === "REJECTED" || m.status === "PENDING") && !disabled ? (
            <DeliverableUploader projectId={projectId} milestoneId={m.id} onUploaded={onChanged} />
          ) : null}
          {isDesigner && (m.status === "IN_PROGRESS" || m.status === "REJECTED") && m.deliverables.length > 0 && !disabled ? (
            <Button
              size="sm"
              loading={busy === "submit"}
              onClick={() => go("submit", `/api/projects/${projectId}/milestones/${m.id}/submit`, {})}
            >
              Submit for review
            </Button>
          ) : null}
        </div>
      </div>
      {m.deliverables.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {m.deliverables.map((d) => (
            <li key={d.id}>
              v{d.version} · {d.filename} · {(d.sizeBytes / 1024).toFixed(0)} KB · {new Date(d.createdAt).toLocaleString()}
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
        Upload deliverable
      </Button>
    </>
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
      <CardTitle>Conversation</CardTitle>
      <CardSubtitle>Hash-chained, immutable, retained for audit.</CardSubtitle>
      <div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {messages.length === 0 ? <p className="text-muted-foreground">No messages yet.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className="rounded-md bg-card p-2">
            <div className="text-xs text-muted-foreground">
              <strong>
                {m.senderName}
                {m.senderClient ? " (client)" : m.senderUser ? "" : ""}
              </strong>{" "}
              · {new Date(m.createdAt).toLocaleString()}
            </div>
            <div>{m.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
        <Button onClick={send} loading={sending}>
          Send
        </Button>
      </div>
    </Card>
  );
}

function DisputeForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 space-y-2">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue (min 10 chars)" />
      <Button
        size="sm"
        variant="danger"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const r = await fetch(`/api/projects/${projectId}/dispute`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          setBusy(false);
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            alert(j.error ?? "Failed");
          } else router.refresh();
        }}
      >
        Raise dispute
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
