"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/money";
import {
  AlertTriangle,
  Check,
  Lock,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

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

  const releasedMinor = project.milestones
    .filter((m) => m.status === "APPROVED")
    .reduce((s, m) => s + m.amountMinor, 0);
  const releasedPct = order && order.totalMinor > 0 ? Math.round((releasedMinor / order.totalMinor) * 100) : 0;

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <header className="surface flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-block h-7 w-7 rounded-md accent-gradient" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                DesignDesk · client portal
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{project.title}</h1>
              <p className="text-xs text-muted-foreground">
                {project.code} · for {project.clientContact.name ?? project.clientContact.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={project.mode === "SOLO" ? "muted" : "accent"}>{project.mode}</Badge>
            <StatusPill status={project.status} />
          </div>
        </header>

        {err ? (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" />
            {err}
          </div>
        ) : null}

        {project.status === "DISPUTED" ? (
          <Card className="border-danger/30 bg-danger/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-danger" />
              <div>
                <CardTitle className="text-danger">Dispute open</CardTitle>
                <CardSubtitle>Funds are frozen until the dispute is resolved.</CardSubtitle>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <CardTitle>Quote</CardTitle>
                {order?.locked ? (
                  <Badge variant="success">
                    <Lock className="h-3 w-3" /> locked
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <Sparkles className="h-3 w-3" /> awaiting approval
                  </Badge>
                )}
              </div>
              <CardSubtitle className="mt-1">
                Structured quote — locks once both sides approve.
              </CardSubtitle>
              {order ? (
                <>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label={order.packageNameSnapshot} value={formatMoney(order.packagePriceMinor, order.currency)} />
                    {order.addons.map((a) => (
                      <Row key={a.id} label={a.nameSnapshot} value={`+${formatMoney(a.priceMinor, order.currency)}`} />
                    ))}
                    <hr className="my-2 border-border" />
                    <Row label="Subtotal" value={formatMoney(order.subtotalMinor, order.currency)} />
                    <Row label={`Tax (${(order.taxBps / 100).toFixed(0)}%)`} value={formatMoney(order.taxMinor, order.currency)} />
                    <hr className="my-2 border-border" />
                    <div className="flex items-center justify-between text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-semibold tracking-tight">{formatMoney(order.totalMinor, order.currency)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {order.locked
                      ? `Locked ${new Date(order.lockedAt!).toLocaleString()}`
                      : "Awaiting designer/manager approval"}
                  </p>
                  {order.locked && (!payment || payment.status === "REQUIRES_PAYMENT") ? (
                    <Button className="mt-4 w-full" variant="accent" size="lg" loading={busy === "pay"} onClick={pay}>
                      <Wallet className="h-4 w-4" />
                      Pay & fund escrow
                    </Button>
                  ) : null}
                  {payment?.status === "PROCESSING" ? (
                    <div className="mt-4">
                      <Badge variant="warning">Payment processing</Badge>
                    </div>
                  ) : null}
                  {payment?.status === "CAPTURED" || payment?.status === "PARTIALLY_RELEASED" ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>Escrow funded — milestones unlock as you approve them.</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No quote yet.</p>
              )}
            </Card>

            <Card>
              <CardTitle>Milestones</CardTitle>
              <CardSubtitle>Approve work to release the corresponding portion of escrow.</CardSubtitle>
              {project.milestones.length > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Released</span>
                    <span>{releasedPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full accent-gradient transition-[width] duration-500"
                      style={{ width: `${releasedPct}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                {project.milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Milestones appear once the scope is locked.
                  </p>
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
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <CardTitle>Conversation</CardTitle>
              </div>
              <CardSubtitle className="mt-1">Tamper-evident chat with the designer&apos;s team.</CardSubtitle>
              <ChatPanel projectId={project.id} initial={project.messages} />
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardTitle>Team</CardTitle>
              <ul className="mt-3 space-y-3">
                <PartyRow role="Designer" name={project.designer.name ?? project.designer.email} sub={project.designer.email} tone="accent" />
                {project.manager ? (
                  <PartyRow role="Client manager" name={project.manager.name ?? project.manager.email} sub={project.manager.email} tone="warning" />
                ) : null}
              </ul>
            </Card>

            <Card>
              <CardTitle>Need help?</CardTitle>
              {project.disputes.length === 0 && project.status !== "COMPLETED" ? (
                <DisputeForm projectId={project.id} onRaised={() => router.refresh()} />
              ) : project.disputes.length > 0 ? (
                <CardSubtitle className="mt-2">
                  A dispute is open — escrow is frozen.
                </CardSubtitle>
              ) : (
                <CardSubtitle className="mt-2">Project completed.</CardSubtitle>
              )}
            </Card>

            <Card>
              <CardTitle>How this works</CardTitle>
              <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><span className="font-medium text-foreground">1.</span> Both sides approve the quote.</li>
                <li className="flex gap-2"><span className="font-medium text-foreground">2.</span> You pay into platform escrow.</li>
                <li className="flex gap-2"><span className="font-medium text-foreground">3.</span> Designer ships milestones.</li>
                <li className="flex gap-2"><span className="font-medium text-foreground">4.</span> You approve each — escrow releases the share.</li>
              </ol>
            </Card>
          </aside>
        </div>

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Powered by DesignDesk · No account required · Funds held in regulated escrow
        </footer>
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
    <div className="rounded-xl border border-border p-3 transition-colors hover:border-border-strong">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.title}</span>
            <Badge variant={milestoneVariant(m.status)}>{m.status}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {m.kind} · {(m.releaseBps / 100).toFixed(0)}% ·{" "}
            <span className="font-medium text-foreground">{formatMoney(m.amountMinor, currency)}</span>
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
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject((s) => !s)}>
              <X className="h-3.5 w-3.5" />
              Revise
            </Button>
          </div>
        ) : null}
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
      {showReject ? (
        <div className="mt-3 space-y-2">
          <Textarea placeholder="Why are revisions needed? (min 5 chars)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
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
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function milestoneVariant(s: string): "default" | "success" | "warning" | "danger" | "muted" | "accent" {
  if (s === "APPROVED") return "success";
  if (s === "SUBMITTED") return "warning";
  if (s === "REJECTED") return "danger";
  if (s === "DISPUTED") return "danger";
  if (s === "IN_PROGRESS") return "accent";
  return "muted";
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
      <div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-sm pretty-scroll">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <MessageSquare className="mb-2 h-5 w-5" />
            <span className="text-xs">No messages yet — say hi!</span>
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
              >
                {m.senderName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 rounded-lg bg-card p-2 hairline">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.senderName}</span>
                  {isClient ? <Badge variant="success">you</Badge> : null}
                  <span className="ml-auto">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
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
      <p className="mt-2 text-[11px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
    </>
  );
}

function DisputeForm({ projectId, onRaised }: { projectId: string; onRaised: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 space-y-2">
      <CardSubtitle>Raise an issue if something is wrong. Escrow freezes immediately.</CardSubtitle>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue (min 10 chars)" />
      <Button
        size="sm"
        variant="danger"
        className="w-full"
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

function PartyRow({ role, name, sub, tone }: { role: string; name: string; sub: string; tone: "accent" | "warning" }) {
  const cls = tone === "accent" ? "accent-gradient text-white" : "bg-warning/15 text-warning";
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${cls}`}>
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{role} · {sub}</div>
      </div>
    </li>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
