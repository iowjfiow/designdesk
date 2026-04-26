"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { Check, FileText, Mail, Package, Plus, Sparkles, User, Users } from "lucide-react";

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
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card>
          <SectionHeader step="1" icon={<Users className="h-4 w-4" />} title="Mode" subtitle="How will this project run?" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === "SOLO"}
              icon={<User className="h-4 w-4" />}
              title="Solo"
              body="You handle the client end-to-end. 100% goes to you."
              onClick={() => setMode("SOLO")}
            />
            <ModeCard
              active={mode === "COLLAB"}
              icon={<Users className="h-4 w-4" />}
              title="Collaboration"
              body="A Client Manager brings the client. Revenue auto-splits."
              onClick={() => setMode("COLLAB")}
            />
          </div>
        </Card>

        <Card>
          <SectionHeader step="2" icon={<FileText className="h-4 w-4" />} title="Project" subtitle="Title and brief." />
          <div className="mt-4 grid gap-4">
            <Field>
              <Label>Project title</Label>
              <Input placeholder="e.g. Acme Logo redesign" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <Label>Brief / requirements</Label>
              <Textarea placeholder="Markdown welcome — colours, references, constraints…" value={briefMd} onChange={(e) => setBriefMd(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader step="3" icon={<Package className="h-4 w-4" />} title="Base package" subtitle="Pricing locks once both sides approve." />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {packages.map((p) => {
              const active = packageId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  className={`relative flex flex-col rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-accent/40 bg-accent/5 shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
                      : "border-border hover:border-border-strong hover:bg-muted/40"
                  }`}
                >
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full accent-gradient text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                  <div className="mt-3 text-xl font-semibold tracking-tight">{formatMoney(p.priceMinor, p.currency)}</div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />{p.concepts} concept{p.concepts > 1 ? "s" : ""}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />{p.revisions} revision{p.revisions !== 1 ? "s" : ""}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />Delivery in {p.deliveryDays} days</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />Files: {p.includedFiles.join(", ")}</li>
                  </ul>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader step="4" icon={<Plus className="h-4 w-4" />} title="Add-ons" subtitle="Optional extras. Total updates live." />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {addons.map((a) => {
              const on = selectedAddons.has(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    on
                      ? "border-accent/40 bg-accent/5"
                      : "border-border hover:border-border-strong hover:bg-muted/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-md border ${
                      on ? "accent-gradient border-transparent text-white" : "border-border-strong"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={(e) => {
                      const next = new Set(selectedAddons);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      setSelectedAddons(next);
                    }}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">{a.description}</span>
                  </span>
                  <span className="text-sm font-medium">+{formatMoney(a.priceMinor, a.currency)}</span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader step="5" icon={<Mail className="h-4 w-4" />} title="Parties" subtitle="Client gets a magic-link — no signup." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Client email *</Label>
              <Input type="email" placeholder="client@brand.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </Field>
            <Field>
              <Label>Client name (optional)</Label>
              <Input placeholder="Carla Chen" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </Field>
            {mode === "COLLAB" ? (
              <Field className="sm:col-span-2">
                <Label>Client Manager email *</Label>
                <Input type="email" placeholder="manager@example.com" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
              </Field>
            ) : null}
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Order summary</CardTitle>
            <Badge variant={mode === "COLLAB" ? "accent" : "muted"}>{mode}</Badge>
          </div>
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
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tracking-tight">{formatMoney(totalMinor, currency)}</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-accent" />
            {mode === "COLLAB" ? "Designer 60% / Manager 40% (editable on project page)" : "100% goes to you — no manager party"}
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Button className="mt-5 w-full" variant="accent" size="lg" onClick={submit} loading={submitting}>
            Create project
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Both sides approve — then pricing locks. The client gets a magic-link by email.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function ModeCard({ active, title, body, icon, onClick }: { active: boolean; title: string; body: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-accent/40 bg-accent/5 shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
          : "border-border hover:border-border-strong hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            active ? "accent-gradient text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </span>
        {active ? <Check className="h-4 w-4 text-accent" /> : null}
      </div>
      <div className="mt-3 text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </button>
  );
}

function SectionHeader({
  step,
  icon,
  title,
  subtitle,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-semibold text-accent">
        {step}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        {subtitle ? <CardSubtitle className="mt-0.5">{subtitle}</CardSubtitle> : null}
      </div>
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
  return <div className="my-1 h-px w-full bg-border" />;
}
