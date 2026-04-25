"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";

type ProjectDetail = {
  id: string;
  code: string;
  title: string;
  mode: "SOLO" | "COLLAB";
  status: string;
  designerId: string;
  managerId: string | null;
  clientId: string;
  designerBps: number;
  managerBps: number;
  designer: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean };
  manager: { id: string; name: string | null; email: string; stripeAccountId: string | null; payoutsEnabled: boolean } | null;
  client: { id: string; name: string | null; email: string };
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
  messages: { id: string; body: string; createdAt: string; senderId: string; sender: { id: string; name: string | null; role: string } }[];
  disputes: { id: string; reason: string; status: string }[];
  activityLogs: { id: string; action: string; createdAt: string; actor: { id: string; name: string | null; role: string } | null; metadata: unknown }[];
};

export function ProjectWorkspace({ project, meId }: { project: ProjectDetail; meId: string }) {
  const router = useRouter();
  const isDesigner = project.designerId === meId;
  const isManager = project.managerId === meId;
  const isClient = project.clientId === meId;
  const order = project.order;
  const payment = order?.payments.find((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_RELEASED" || p.status === "REQUIRES_PAYMENT" || p.status === "PROCESSING");

  const refresh = () => router.refresh();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(action: string, url: string, init?: RequestInit) {
    setBusy(action); setErr(null);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            {project.code} ·{" "}
            <Badge variant={project.mode === "SOLO" ? "muted" : "accent"}>{project.mode}</Badge>{" "}
            <Badge>{project.status.replace("_", " ")}</Badge>
          </p>
        </div>
        {project.status === "DISPUTED" ? (
          <Badge variant="danger">Disputed — escrow frozen</Badge>
        ) : null}
      </div>

      {err ? <Card className="border-danger text-danger"><CardSubtitle>{err}</CardSubtitle></Card> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Workflow</CardTitle>
            <CardSubtitle>Each step is recorded; pricing/scope are frozen at lock.</CardSubtitle>
            <ol className="mt-4 space-y-3 text-sm">
              <Step
                done={order?.locked ?? false}
                active={!!order && !order.locked}
                label="Order locked"
                action={
                  (isDesigner || isManager) && order && !order.locked ? (
                    <Button size="sm" loading={busy === "lock"} onClick={() => call("lock", `/api/projects/${project.id}/lock`)}>
                      Lock order
                    </Button>
                  ) : null
                }
              />
              <Step
                done={!!payment && payment.status !== "REQUIRES_PAYMENT" && payment.status !== "PROCESSING"}
                active={!!order?.locked && (!payment || payment.status === "REQUIRES_PAYMENT" || payment.status === "PROCESSING")}
                label="Escrow funded"
                action={
                  isClient && order?.locked && (!payment || payment.status === "REQUIRES_PAYMENT") ? (
                    <PayButton projectId={project.id} />
                  ) : payment && payment.status === "PROCESSING" ? <Badge variant="warning">Processing</Badge> : null
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
            <CardSubtitle>Funds release as each milestone is approved.</CardSubtitle>
            <div className="mt-4 space-y-3">
              {project.milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  m={m}
                  currency={order?.currency ?? "INR"}
                  isDesigner={isDesigner}
                  isClient={isClient}
                  projectId={project.id}
                  onChanged={refresh}
                  disabled={project.status === "DISPUTED"}
                />
              ))}
              {project.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Lock the order to generate milestones.</p>
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
            ) : <p className="text-sm text-muted-foreground">No order.</p>}
          </Card>

          <Card>
            <CardTitle>Parties</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              <li><strong>Client:</strong> {project.client.name ?? project.client.email}</li>
              <li><strong>Designer:</strong> {project.designer.name ?? project.designer.email}</li>
              {project.manager ? (
                <li><strong>Manager:</strong> {project.manager.name ?? project.manager.email}</li>
              ) : null}
            </ul>
            {project.mode === "COLLAB" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Split: Designer {(project.designerBps / 100).toFixed(0)}% / Manager {(project.managerBps / 100).toFixed(0)}%
              </p>
            ) : null}
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
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-muted text-muted-foreground"}`}>
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
  isClient,
  projectId,
  onChanged,
  disabled,
}: {
  m: ProjectDetail["milestones"][number];
  currency: string;
  isDesigner: boolean;
  isClient: boolean;
  projectId: string;
  onChanged: () => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

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
            <Button size="sm" loading={busy === "submit"} onClick={() => go("submit", `/api/projects/${projectId}/milestones/${m.id}/submit`, {})}>
              Submit for review
            </Button>
          ) : null}
          {isClient && m.status === "SUBMITTED" && !disabled ? (
            <>
              <Button size="sm" variant="success" loading={busy === "approve"} onClick={() => go("approve", `/api/projects/${projectId}/milestones/${m.id}/approve`)}>
                Approve & release
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject((s) => !s)}>Request revision</Button>
            </>
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
      {showReject ? (
        <div className="mt-3 space-y-2">
          <Textarea placeholder="Why are revisions needed?" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            size="sm"
            variant="danger"
            loading={busy === "reject"}
            onClick={async () => {
              await go("reject", `/api/projects/${projectId}/milestones/${m.id}/reject`, { reason });
              setShowReject(false);
              setReason("");
            }}
          >
            Send revision request
          </Button>
        </div>
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

function ChatPanel({ projectId, initial }: { projectId: string; initial: ProjectDetail["messages"] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

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
      if (!res.ok) { alert(j.error ?? "Failed"); return; }
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
              <strong>{m.sender.name ?? m.sender.role}</strong> · {new Date(m.createdAt).toLocaleString()}
            </div>
            <div>{m.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
        <Button onClick={send} loading={sending}>Send</Button>
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
          if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error ?? "Failed"); }
          else router.refresh();
        }}
      >
        Raise dispute
      </Button>
    </div>
  );
}

function PayButton({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="accent"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch(`/api/projects/${projectId}/pay`, { method: "POST" });
          const j = await r.json();
          if (!r.ok) { alert(j.error ?? "Failed"); return; }
          if (j.publishableKey && j.clientSecret) {
            // Redirect to a hosted checkout page that confirms with Stripe.js
            window.location.href = `/checkout?cs=${encodeURIComponent(j.clientSecret)}&pk=${encodeURIComponent(j.publishableKey)}&pid=${encodeURIComponent(projectId)}`;
          } else {
            alert("Payment provider not configured. Set STRIPE_SECRET_KEY and reload.");
          }
        } finally { setBusy(false); }
      }}
    >
      Pay & fund escrow
    </Button>
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
function Divider() { return <div className="my-1 h-px w-full bg-border" />; }
