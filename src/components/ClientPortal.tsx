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
  Briefcase,
  Building2,
  Calendar,
  Check,
  Globe,
  Link2,
  Lock,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
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
  briefMd: string | null;
  status: string;
  mode: "SOLO" | "COLLAB";
  deadline: string | null;
  budgetMinor: number | null;
  references: string[];
  designer: { name: string | null; email: string } | null;
  manager: { name: string | null; email: string } | null;
  clientContact: { id: string; name: string | null; email: string; company: string | null; phone: string | null; website: string | null };
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

            {project.status === "COMPLETED" ? (
              <FinalReviewCard projectId={project.id} />
            ) : null}

            <ClientProjectInfoCard project={project} />

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
                {project.designer ? (
                  <PartyRow role="Designer" name={project.designer.name ?? project.designer.email} sub={project.designer.email} tone="accent" />
                ) : (
                  <PartyRow role="Designer" name="Awaiting claim" sub="A designer will pick this up shortly" tone="accent" />
                )}
                {project.manager ? (
                  <PartyRow role="Client manager" name={project.manager.name ?? project.manager.email} sub={project.manager.email} tone="warning" />
                ) : null}
              </ul>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <CardTitle>Raise a dispute</CardTitle>
              </div>
              {project.disputes.length === 0 && project.status !== "COMPLETED" ? (
                <>
                  <CardSubtitle className="mt-1">
                    Something off? Tell us what&apos;s wrong. Escrow freezes immediately and an admin will mediate.
                  </CardSubtitle>
                  <DisputeForm projectId={project.id} onRaised={() => router.refresh()} />
                </>
              ) : project.disputes.length > 0 ? (
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Dispute open — escrow frozen
                    </div>
                    {project.disputes[0]?.reason ? (
                      <p className="mt-1 text-foreground/80">&ldquo;{project.disputes[0].reason}&rdquo;</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <CardSubtitle className="mt-2">Project completed — disputes can&apos;t be raised.</CardSubtitle>
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
      {(m.status === "APPROVED" || m.status === "REJECTED") && !disabled ? (
        <MilestoneFeedback projectId={projectId} milestoneId={m.id} />
      ) : null}
    </div>
  );
}

function MilestoneFeedback({ projectId, milestoneId }: { projectId: string; milestoneId: string }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (comment.trim().length < 1) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "MILESTONE", milestoneId, comment: comment.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Failed");
        return;
      }
      setDone(true);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-success">
        <Check className="h-3 w-3" /> Feedback sent — thanks!
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="h-3 w-3" /> Leave detailed feedback on this milestone
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <Textarea
        placeholder="Tell the designer what worked, what didn't, what to refine."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="accent" loading={submitting} onClick={submit}>
          Send feedback
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
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
  const [err, setErr] = useState<string | null>(null);
  const tooShort = reason.trim().length < 10;
  return (
    <div className="mt-3 space-y-2">
      <Textarea
        rows={3}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (err) setErr(null);
        }}
        placeholder="Describe the issue — what's wrong, what you expected, any timeline."
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={tooShort ? "" : "text-success"}>
          {reason.trim().length}/10 characters minimum
        </span>
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
          onRaised();
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Raise dispute & freeze escrow
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

function ClientProjectInfoCard({ project }: { project: Project }) {
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
      <CardSubtitle className="mt-1">What you shared when placing this order.</CardSubtitle>
      <div className="mt-3 space-y-3 text-sm">
        {hasBrief ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brief</div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{project.briefMd}</p>
          </div>
        ) : null}
        {hasContact ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</div>
            <ul className="mt-1 space-y-1">
              {c.company ? <ClientInfoRow icon={<Building2 className="h-3 w-3" />} value={c.company} /> : null}
              {c.phone ? <ClientInfoRow icon={<Phone className="h-3 w-3" />} value={c.phone} /> : null}
              {c.website ? (
                <ClientInfoRow
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
                <ClientInfoRow icon={<Calendar className="h-3 w-3" />} value={`Deadline ${new Date(project.deadline).toLocaleDateString()}`} />
              ) : null}
              {project.budgetMinor ? (
                <ClientInfoRow icon={<Wallet className="h-3 w-3" />} value={`Budget ${formatMoney(project.budgetMinor, currency)}`} />
              ) : null}
              {project.references.length > 0
                ? project.references.map((r) => (
                    <ClientInfoRow
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
                  ))
                : null}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ClientInfoRow({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 flex-shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 text-foreground">{value}</span>
    </li>
  );
}

function FinalReviewCard({ projectId }: { projectId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (rating < 1) return setError("Pick a star rating from 1 to 5.");
    if (comment.trim().length < 1) return setError("Please share a quick note about your experience.");
    setSubmitting(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "FINAL", rating, comment: comment.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Failed to submit review");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-4 w-4" />
          </span>
          <div>
            <CardTitle>Thanks for your review!</CardTitle>
            <CardSubtitle className="mt-0.5">It helps your designer build their reputation.</CardSubtitle>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-accent" />
        <CardTitle>Rate this project</CardTitle>
      </div>
      <CardSubtitle className="mt-1">
        Your project is complete — leave a 1–5 star review and a few words for your designer.
      </CardSubtitle>
      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-1"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                (hover || rating) >= n ? "fill-warning text-warning" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {rating > 0 ? (
          <span className="ml-2 text-sm text-muted-foreground">
            {rating}/5 — {["", "Disappointing", "It was okay", "Good", "Great", "Outstanding"][rating]}
          </span>
        ) : null}
      </div>
      <Textarea
        className="mt-3"
        placeholder="What did your designer do well? Anything to improve?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error ? (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <div className="mt-3">
        <Button variant="accent" onClick={submit} loading={submitting}>
          Submit review
        </Button>
      </div>
    </Card>
  );
}
