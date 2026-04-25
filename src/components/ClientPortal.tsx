"use client";
import { useState } from "react";
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

type Project = {
  id: string;
  code: string;
  title: string;
  status: string;
  mode: "SOLO" | "COLLAB";
  designer: { name: string | null; email: string };
  manager: { name: string | null; email: string } | null;
  clientContact: { name: string | null; email: string };
  order: {
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
    payments: { id: string; status: string; clientSecret: string | null }[];
  } | null;
  milestones: {
    id: string;
    kind: string;
    title: string;
    status: string;
    amountMinor: number;
    releaseBps: number;
    deliverables: { id: string; filename: string; version: number; sizeBytes: number; createdAt: string }[];
  }[];
  messages: Message[];
  disputes: { id: string; reason: string; status: string }[];
};

export function ClientPortal({ project }: { project: Project }) {
  const router = useRouter();
  const order = project.order;
  const payment = order?.payments.find(
    (p) =>
      p.status === "CAPTURED" || p.status === "PARTIALLY_RELEASED" || p.status === "REQUIRES_PAYMENT" || p.status === "PROCESSING",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(url: string, init?: RequestInit) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, ...init });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Request failed");
    return j;
  }

  async function pay() {
    setBusy("pay");
    setErr(null);
    try {
      const j = await call(`/api/projects/${project.id}/pay`);
      if (j.publishableKey && j.clientSecret) {
        window.location.href = `/checkout?cs=${encodeURIComponent(j.clientSecret)}&pk=${encodeURIComponent(j.publishableKey)}&pid=${encodeURIComponent(project.id)}`;
      } else {
        setErr("Payment provider isn't configured yet. The designer will set it up.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">DesignDesk · client portal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            {project.code} · <Badge>{project.status.replace(/_/g, " ")}</Badge>
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          For {project.clientContact.name ?? project.clientContact.email}
        </div>
      </header>

      {err ? (
        <Card className="border-danger text-danger">
          <CardSubtitle>{err}</CardSubtitle>
        </Card>
      ) : null}

      {project.status === "DISPUTED" ? (
        <Card className="border-danger">
          <CardTitle>Dispute open</CardTitle>
          <CardSubtitle>Funds are frozen until the dispute is resolved.</CardSubtitle>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Quote</CardTitle>
            <CardSubtitle>The designer&apos;s structured quote — locked once both sides approve.</CardSubtitle>
            {order ? (
              <div className="mt-3 space-y-1 text-sm">
                <Row label={order.packageNameSnapshot} value={formatMoney(order.packagePriceMinor, order.currency)} />
                {order.addons.map((a) => (
                  <Row key={a.id} label={a.nameSnapshot} value={`+${formatMoney(a.priceMinor, order.currency)}`} />
                ))}
                <hr className="my-2 border-border" />
                <Row label="Subtotal" value={formatMoney(order.subtotalMinor, order.currency)} />
                <Row label={`Tax (${(order.taxBps / 100).toFixed(0)}%)`} value={formatMoney(order.taxMinor, order.currency)} />
                <hr className="my-2 border-border" />
                <Row
                  label={<strong>Total</strong>}
                  value={<strong>{formatMoney(order.totalMinor, order.currency)}</strong>}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {order.locked ? `Locked ${new Date(order.lockedAt!).toLocaleString()}` : "Awaiting designer/manager approval"}
                </p>
                {order.locked && (!payment || payment.status === "REQUIRES_PAYMENT") ? (
                  <Button variant="accent" loading={busy === "pay"} onClick={pay}>
                    Pay & fund escrow
                  </Button>
                ) : null}
                {payment?.status === "PROCESSING" ? <Badge variant="warning">Payment processing</Badge> : null}
                {payment?.status === "CAPTURED" || payment?.status === "PARTIALLY_RELEASED" ? (
                  <Badge variant="success">Escrow funded</Badge>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No quote yet.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Milestones</CardTitle>
            <CardSubtitle>Approve work to release the corresponding portion of escrow.</CardSubtitle>
            <div className="mt-3 space-y-3">
              {project.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Milestones appear once the scope is locked.</p>
              ) : null}
              {project.milestones.map((m) => (
                <ClientMilestoneRow
                  key={m.id}
                  m={m}
                  currency={order?.currency ?? "INR"}
                  projectId={project.id}
                  onChanged={() => router.refresh()}
                  disabled={project.status === "DISPUTED"}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Conversation</CardTitle>
            <CardSubtitle>Tamper-evident chat with the designer.</CardSubtitle>
            <ChatPanel projectId={project.id} initial={project.messages} />
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardTitle>Team</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <strong>Designer:</strong> {project.designer.name ?? project.designer.email}
              </li>
              {project.manager ? (
                <li>
                  <strong>Client manager:</strong> {project.manager.name ?? project.manager.email}
                </li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <CardTitle>Need help?</CardTitle>
            {project.disputes.length === 0 && project.status !== "COMPLETED" ? (
              <DisputeForm projectId={project.id} onRaised={() => router.refresh()} />
            ) : project.disputes.length > 0 ? (
              <CardSubtitle>A dispute is open — escrow is frozen.</CardSubtitle>
            ) : (
              <CardSubtitle>Project completed.</CardSubtitle>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ClientMilestoneRow({
  m,
  currency,
  projectId,
  onChanged,
  disabled,
}: {
  m: Project["milestones"][number];
  currency: string;
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
            <Badge>{m.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {m.kind} · {(m.releaseBps / 100).toFixed(0)}% · {formatMoney(m.amountMinor, currency)}
          </div>
        </div>
        {m.status === "SUBMITTED" && !disabled ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              loading={busy === "approve"}
              onClick={() => go("approve", `/api/projects/${projectId}/milestones/${m.id}/approve`)}
            >
              Approve & release
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject((s) => !s)}>
              Request revision
            </Button>
          </div>
        ) : null}
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

function ChatPanel({ projectId, initial }: { projectId: string; initial: Message[] }) {
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
    <>
      <div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {messages.length === 0 ? <p className="text-muted-foreground">No messages yet.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className="rounded-md bg-card p-2">
            <div className="text-xs text-muted-foreground">
              <strong>{m.senderName}</strong> · {new Date(m.createdAt).toLocaleString()}
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
    </>
  );
}

function DisputeForm({ projectId, onRaised }: { projectId: string; onRaised: () => void }) {
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
          } else onRaised();
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
