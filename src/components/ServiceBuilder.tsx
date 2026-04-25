"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";

type Pkg = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  concepts: number;
  revisions: number;
  deliveryDays: number;
  includedFiles: string[];
};
type Addon = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
};

export function ServiceBuilder({ defaultMode }: { defaultMode: "SOLO" | "COLLAB" }) {
  const router = useRouter();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [mode, setMode] = useState<"SOLO" | "COLLAB">(defaultMode);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [briefMd, setBriefMd] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [taxBps] = useState(1800); // GST 18% default; could be made editable
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/catalog/packages").then((r) => r.json()),
      fetch("/api/catalog/addons").then((r) => r.json()),
    ]).then(([p, a]) => {
      setPackages(p.packages ?? []);
      setAddons(a.addons ?? []);
      if (p.packages?.[0]) setPackageId(p.packages[0].id);
    });
  }, []);

  const pkg = packages.find((p) => p.id === packageId);
  const subtotalMinor =
    (pkg?.priceMinor ?? 0) +
    addons.filter((a) => selectedAddons.has(a.id)).reduce((s, a) => s + a.priceMinor, 0);
  const taxMinor = Math.floor((subtotalMinor * taxBps) / 10_000);
  const totalMinor = subtotalMinor + taxMinor;
  const currency = pkg?.currency ?? "INR";

  async function submit() {
    setError(null);
    if (!pkg) return setError("Select a package");
    if (!clientEmail) return setError("Client email is required");
    if (mode === "COLLAB" && !managerEmail) return setError("Manager email is required for collab mode");
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          briefMd,
          mode,
          clientEmail,
          clientName: clientName || undefined,
          managerEmail: mode === "COLLAB" ? managerEmail : undefined,
          packageId: pkg.id,
          addonIds: Array.from(selectedAddons),
          taxBps,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create project");
      router.push(`/dashboard/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardTitle>Mode</CardTitle>
          <CardSubtitle>How will this project run?</CardSubtitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === "SOLO"}
              title="Solo"
              body="You handle the client end-to-end. 100% of payment goes to you."
              onClick={() => setMode("SOLO")}
            />
            <ModeCard
              active={mode === "COLLAB"}
              title="Collaboration"
              body="A Client Manager brings the client. Revenue is auto-split."
              onClick={() => setMode("COLLAB")}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Project</CardTitle>
          <div className="mt-4 grid gap-3">
            <Input placeholder="Project title (e.g. Acme Logo)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Brief / requirements (markdown welcome)" value={briefMd} onChange={(e) => setBriefMd(e.target.value)} />
          </div>
        </Card>

        <Card>
          <CardTitle>Step 1 — Base package</CardTitle>
          <CardSubtitle>Choose the package that fits this project. Pricing is locked once confirmed.</CardSubtitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {packages.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPackageId(p.id)}
                className={`text-left surface p-4 transition ${packageId === p.id ? "ring-2 ring-accent" : "hover:bg-muted/40"}`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{p.description}</div>
                <div className="mt-3 text-lg font-semibold">{formatMoney(p.priceMinor, p.currency)}</div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>{p.concepts} concept{p.concepts > 1 ? "s" : ""}</li>
                  <li>{p.revisions} revision{p.revisions !== 1 ? "s" : ""}</li>
                  <li>Delivery in {p.deliveryDays} days</li>
                  <li>Files: {p.includedFiles.join(", ")}</li>
                </ul>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Step 2 — Add-ons</CardTitle>
          <CardSubtitle>Optional extras. Total updates instantly.</CardSubtitle>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {addons.map((a) => {
              const on = selectedAddons.has(a.id);
              return (
                <label
                  key={a.id}
                  className={`surface flex cursor-pointer items-center justify-between p-3 ${on ? "ring-2 ring-accent" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const next = new Set(selectedAddons);
                        if (e.target.checked) next.add(a.id);
                        else next.delete(a.id);
                        setSelectedAddons(next);
                      }}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    </div>
                  </div>
                  <div className="text-sm">+{formatMoney(a.priceMinor, a.currency)}</div>
                </label>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Step 3 — Parties</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Client email *" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            <Input placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            {mode === "COLLAB" ? (
              <Input
                placeholder="Client Manager email *"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="sm:col-span-2"
              />
            ) : null}
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardTitle>Order summary</CardTitle>
          <div className="mt-4 space-y-2 text-sm">
            <Row label={pkg?.name ?? "—"} value={pkg ? formatMoney(pkg.priceMinor, pkg.currency) : "—"} />
            {addons
              .filter((a) => selectedAddons.has(a.id))
              .map((a) => (
                <Row key={a.id} label={a.name} value={`+${formatMoney(a.priceMinor, a.currency)}`} />
              ))}
            <Divider />
            <Row label="Subtotal" value={formatMoney(subtotalMinor, currency)} />
            <Row label={`Tax (${(taxBps / 100).toFixed(0)}%)`} value={formatMoney(taxMinor, currency)} />
            <Divider />
            <Row label={<strong>Total</strong>} value={<strong>{formatMoney(totalMinor, currency)}</strong>} />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <Badge variant={mode === "COLLAB" ? "accent" : "muted"} className="mr-2">{mode}</Badge>
            {mode === "COLLAB" ? "Designer 60% / Manager 40% (default)" : "100% to you"}
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <Button className="mt-5 w-full" variant="accent" size="lg" onClick={submit} loading={submitting}>
            Create project
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Pricing locks when the client confirms — no hidden changes.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function ModeCard({ active, title, body, onClick }: { active: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`surface p-4 text-left transition ${active ? "ring-2 ring-accent" : "hover:bg-muted/40"}`}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </button>
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
  return <div className="my-1 h-px w-full bg-border" />;
}
