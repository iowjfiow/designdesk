"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Field, Label } from "@/components/ui/Input";
import { Hand, Briefcase, Users } from "lucide-react";

type Role = "DESIGNER" | "CLIENT_MANAGER" | "ADMIN" | string;

export function ClaimButton({ projectId, role }: { projectId: string; role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isManager = role === "CLIENT_MANAGER";
  const myRoleLabel = isManager ? "Client Manager" : role === "ADMIN" ? "Admin" : "Designer";

  // For a designer/admin claiming: ask "do you want a manager involved?"
  // For a manager claiming: ask "which designer will execute the work?" (required)
  type Mode = "solo" | "with-manager" | "with-designer";
  const initialMode: Mode = isManager ? "with-designer" : "solo";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [designerEmail, setDesignerEmail] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      if (mode === "with-designer") {
        if (!designerEmail.includes("@")) {
          setSubmitting(false);
          return setError("Designer email is required.");
        }
        payload.designerEmail = designerEmail.trim();
      } else if (mode === "with-manager") {
        if (!managerEmail.includes("@")) {
          setSubmitting(false);
          return setError("Manager email is required.");
        }
        payload.managerEmail = managerEmail.trim();
      }
      const r = await fetch(`/api/projects/${projectId}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Could not claim");
      router.push(`/dashboard/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        <Hand className="h-3.5 w-3.5" />
        {isManager ? "Claim — assign roles" : "Claim — set up roles"}
      </Button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Set roles</div>
          <h4 className="mt-0.5 text-sm font-semibold tracking-tight">Who&apos;s doing what?</h4>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {/* You are clearly assigned to one role already; show this prominently. */}
      <div className="mb-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
          {isManager ? <Users className="h-4 w-4 text-accent" /> : <Briefcase className="h-4 w-4 text-accent" />}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">You — {myRoleLabel}</div>
            <div className="text-foreground">{isManager ? "Brings the client. Manages relationship." : "Executes the design work."}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-muted-foreground">
          {isManager ? <Briefcase className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider">Other side</div>
            <div>{isManager ? "Designer — pick below." : "Client manager — optional."}</div>
          </div>
        </div>
      </div>

      {!isManager ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <ModeChoice
            active={mode === "solo"}
            onClick={() => setMode("solo")}
            title="Solo — I keep 100%"
            body="No manager. You handle the client directly. You earn the full payout."
            icon={<Briefcase className="h-4 w-4" />}
          />
          <ModeChoice
            active={mode === "with-manager"}
            onClick={() => setMode("with-manager")}
            title="With a manager"
            body="A manager helps run the client relationship. Payout splits per BPS."
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      ) : null}

      {(isManager || mode === "with-manager") && !isManager ? null : null}

      {/* Designer email — required for manager, hidden for designer */}
      {isManager ? (
        <Field>
          <Label>Designer email *</Label>
          <Input
            type="email"
            placeholder="designer@example.com"
            value={designerEmail}
            onChange={(e) => setDesignerEmail(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Pick the designer who&apos;ll execute the work. They must already have a DesignDesk account.
          </p>
        </Field>
      ) : null}

      {/* Manager email — only when designer/admin chose to add one */}
      {!isManager && mode === "with-manager" ? (
        <Field>
          <Label>Client manager email *</Label>
          <Input
            type="email"
            placeholder="manager@example.com"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            They must already have a DesignDesk account with the Client Manager role.
          </p>
        </Field>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="accent" size="sm" onClick={submit} loading={submitting}>
          <Hand className="h-3.5 w-3.5" />
          Claim & start
        </Button>
      </div>
    </div>
  );
}

function ModeChoice({
  active,
  onClick,
  title,
  body,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 transition-all ${
        active
          ? "border-accent bg-accent/5 ring-2 ring-accent/40"
          : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
      }`}
    >
      <div className={`flex items-center gap-2 text-sm font-semibold ${active ? "text-accent" : "text-foreground"}`}>
        {icon} {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </button>
  );
}
