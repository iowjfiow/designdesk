"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ConnectButton({ enabled, accountId }: { enabled: boolean; accountId: string | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={enabled ? "outline" : "accent"}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/connect", { method: "POST" });
            const j = await r.json();
            if (!r.ok) { alert(j.error ?? "Failed"); return; }
            window.location.href = j.url;
          } finally { setBusy(false); }
        }}
      >
        {enabled ? "Update Connect details" : accountId ? "Continue onboarding" : "Connect to Stripe"}
      </Button>
      {accountId ? (
        <Button
          variant="ghost"
          onClick={async () => {
            const r = await fetch("/api/connect");
            const j = await r.json();
            if (j.status?.payoutsEnabled) location.reload();
            else alert("Payouts not yet enabled.");
          }}
        >
          Refresh status
        </Button>
      ) : null}
    </div>
  );
}
