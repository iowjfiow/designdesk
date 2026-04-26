"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Field, Label } from "@/components/ui/Input";
import { Hand } from "lucide-react";

export function ClaimButton({ projectId, role }: { projectId: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counterpartyEmail, setCounterpartyEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = role === "CLIENT_MANAGER";
  const counterpartyLabel = isManager ? "Designer email" : "Client manager email (optional)";
  const counterpartyHint = isManager
    ? "The designer who'll execute the work. They must already have an account."
    : "Leave empty to run solo (you keep 100%). Provide a manager to split.";

  async function quickClaim() {
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Could not claim");
      router.push(`/dashboard/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  async function claimWithCounterparty() {
    setError(null);
    if (isManager && !counterpartyEmail.includes("@")) {
      return setError("Manager must specify a designer email.");
    }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      if (counterpartyEmail) {
        if (isManager) payload.designerEmail = counterpartyEmail;
        else payload.managerEmail = counterpartyEmail;
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
      <div className="flex flex-wrap gap-2">
        {!isManager ? (
          <Button variant="accent" size="sm" onClick={quickClaim} loading={submitting}>
            <Hand className="h-3.5 w-3.5" /> Claim solo
          </Button>
        ) : null}
        <Button variant={isManager ? "accent" : "outline"} size="sm" onClick={() => setOpen(true)}>
          <Hand className="h-3.5 w-3.5" />
          {isManager ? "Claim & assign designer" : "Claim & invite manager"}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/20 p-3">
      <Field>
        <Label>{counterpartyLabel}</Label>
        <Input
          type="email"
          placeholder={isManager ? "designer@example.com" : "manager@example.com"}
          value={counterpartyEmail}
          onChange={(e) => setCounterpartyEmail(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">{counterpartyHint}</p>
      </Field>
      {error ? (
        <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Button variant="accent" size="sm" onClick={claimWithCounterparty} loading={submitting}>
          Claim
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
