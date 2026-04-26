"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  FileImage,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Mail,
  Package,
  Palette,
  Plus,
  Search,
  Share2,
  Shield,
  Sparkles,
  Star,
  User,
  Wallet,
  Zap,
} from "lucide-react";

type AddonCategory =
  | "FORMAT"
  | "MOCKUP"
  | "BRAND_ASSET"
  | "SOCIAL_MEDIA"
  | "USAGE_RIGHTS"
  | "EXTRA";

type Pkg = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  currency: string;
  concepts: number;
  revisions: number;
  deliveryDays: number;
  includedFiles: string[];
  highlights: string[];
  popular: boolean;
};
type Addon = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: AddonCategory;
  priceMinor: number;
  currency: string;
};

const ADDON_CATEGORIES: {
  key: AddonCategory;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  { key: "FORMAT", label: "Formats", subtitle: "File types you'll receive", icon: <FileImage className="h-4 w-4" /> },
  { key: "MOCKUP", label: "Mockups", subtitle: "Photoreal scenes for pitching", icon: <ImageIcon className="h-4 w-4" /> },
  { key: "BRAND_ASSET", label: "Brand assets", subtitle: "Palette, type, guidelines", icon: <Palette className="h-4 w-4" /> },
  { key: "SOCIAL_MEDIA", label: "Social media", subtitle: "Templates and launch posts", icon: <Share2 className="h-4 w-4" /> },
  { key: "USAGE_RIGHTS", label: "Usage rights", subtitle: "Personal / commercial / extended", icon: <Shield className="h-4 w-4" /> },
  { key: "EXTRA", label: "Extras", subtitle: "Express, extra revisions, more", icon: <Zap className="h-4 w-4" /> },
];

export function OrderForm() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [briefMd, setBriefMd] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWebsite, setClientWebsite] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [references, setReferences] = useState("");
  const [taxBps] = useState(1800);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ projectId: string; code: string; magicLink: string | null } | null>(null);
  const [addonSearch, setAddonSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<AddonCategory>>(
    new Set<AddonCategory>(["FORMAT", "USAGE_RIGHTS"]),
  );

  useEffect(() => {
    void Promise.all([
      fetch("/api/catalog/packages").then((r) => r.json()),
      fetch("/api/catalog/addons").then((r) => r.json()),
    ]).then(([pk, ad]) => {
      setPackages(pk.packages ?? []);
      setAddons(ad.addons ?? []);
      const popular = (pk.packages ?? []).find((p: Pkg) => p.popular);
      if (popular) setPackageId(popular.id);
    });
  }, []);

  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const currency = pkg?.currency ?? "INR";

  const subtotalMinor = useMemo(() => {
    if (!pkg) return 0;
    return pkg.priceMinor + addons.filter((a) => selectedAddons.has(a.id)).reduce((s, a) => s + a.priceMinor, 0);
  }, [pkg, addons, selectedAddons]);
  const taxMinor = Math.floor((subtotalMinor * taxBps) / 10000);
  const totalMinor = subtotalMinor + taxMinor;

  async function submit() {
    setError(null);
    if (title.trim().length < 2) return setError("Project title is required.");
    if (briefMd.trim().length < 10)
      return setError("Project description is required (10+ characters so the designer can understand it).");
    if (!packageId) return setError("Pick a base package — what type of design do you need?");
    if (!clientName.trim()) return setError("Your name is required.");
    if (!clientEmail.includes("@")) return setError("A valid email is required so we can reach you.");
    if (clientPhone.replace(/\D/g, "").length < 7)
      return setError("A valid phone number is required (at least 7 digits).");
    setSubmitting(true);
    try {
      const refs = references
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const r = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          briefMd: briefMd.trim() || undefined,
          clientEmail: clientEmail.trim(),
          clientName: clientName.trim() || undefined,
          clientCompany: clientCompany.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          clientWebsite: clientWebsite.trim() || undefined,
          packageId,
          addonIds: Array.from(selectedAddons),
          taxBps,
          deadline: deadline || undefined,
          budgetMinor: budget ? Math.round(parseFloat(budget) * 100) : undefined,
          references: refs,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Could not place order");
      setSuccess({ projectId: json.project.id, code: json.project.code, magicLink: json.magicLink ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <PostOrder code={success.code} magicLink={success.magicLink} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card>
          <SectionHeader step="1" icon={<FileText className="h-4 w-4" />} title="Project" subtitle="What do you need designed?" />
          <div className="mt-4 grid gap-4">
            <Field>
              <Label>Project title *</Label>
              <Input placeholder="e.g. Brand identity for my coffee roastery" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <Label>Description *</Label>
              <Textarea
                placeholder="Markdown welcome — colours you love, brands you admire, what your business does, any constraints…"
                value={briefMd}
                onChange={(e) => setBriefMd(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">10+ characters. Tell the designer what you actually want — the more concrete, the better.</p>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader step="2" icon={<Package className="h-4 w-4" />} title="Pick a package *" subtitle="Every package can be customised with add-ons below. One is required." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  {p.popular ? (
                    <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                      <Star className="h-2.5 w-2.5 fill-current" /> Popular
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full accent-gradient text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xl font-semibold tracking-tight">{formatMoney(p.priceMinor, p.currency)}</span>
                    <span className="text-xs text-muted-foreground">starting</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {(p.highlights.length > 0 ? p.highlights : [
                      `${p.concepts} concept${p.concepts > 1 ? "s" : ""}`,
                      `${p.revisions} revisions`,
                      `Delivery in ${p.deliveryDays} days`,
                    ]).map((h) => (
                      <li key={h} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-success" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.includedFiles.slice(0, 4).map((f) => (
                      <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{f}</span>
                    ))}
                    {p.includedFiles.length > 4 ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">+{p.includedFiles.length - 4}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader step="3" icon={<Plus className="h-4 w-4" />} title="Add-ons" subtitle="Browse by category. Total updates live." />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search add-ons…" value={addonSearch} onChange={(e) => setAddonSearch(e.target.value)} className="pl-8" />
            </div>
            {selectedAddons.size > 0 ? (
              <button type="button" onClick={() => setSelectedAddons(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
                Clear {selectedAddons.size}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setOpenCategories(
                  openCategories.size === ADDON_CATEGORIES.length
                    ? new Set()
                    : new Set(ADDON_CATEGORIES.map((c) => c.key)),
                )
              }
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {openCategories.size === ADDON_CATEGORIES.length ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {ADDON_CATEGORIES.map((cat) => {
              const items = addons.filter(
                (a) =>
                  a.category === cat.key &&
                  (addonSearch.length === 0 ||
                    a.name.toLowerCase().includes(addonSearch.toLowerCase()) ||
                    a.description.toLowerCase().includes(addonSearch.toLowerCase())),
              );
              if (items.length === 0) return null;
              const isOpen = openCategories.has(cat.key) || addonSearch.length > 0;
              const selectedInCat = items.filter((i) => selectedAddons.has(i.id)).length;
              return (
                <div key={cat.key} className="overflow-hidden rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(openCategories);
                      if (next.has(cat.key)) next.delete(cat.key);
                      else next.add(cat.key);
                      setOpenCategories(next);
                    }}
                    className="flex w-full items-center gap-3 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                      {cat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {cat.label}
                        {selectedInCat > 0 ? <Badge variant="accent">{selectedInCat} selected</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{cat.subtitle}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen ? (
                    <div className="grid gap-2 border-t border-border bg-card p-3 sm:grid-cols-2">
                      {items.map((a) => {
                        const on = selectedAddons.has(a.id);
                        return (
                          <label
                            key={a.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                              on ? "border-accent/40 bg-accent/5" : "border-border hover:border-border-strong hover:bg-muted/40"
                            }`}
                          >
                            <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border ${on ? "accent-gradient border-transparent text-white" : "border-border-strong"}`}>
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
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium">{a.name}</span>
                              <span className="block text-xs text-muted-foreground">{a.description}</span>
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {a.priceMinor === 0 ? "Free" : `+${formatMoney(a.priceMinor, a.currency)}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader step="4" icon={<User className="h-4 w-4" />} title="Your contact info" subtitle="So your designer can reach you. We never share this." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Your name *</Label>
              <Input placeholder="Carla Chen" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </Field>
            <Field>
              <Label>Email *</Label>
              <Input type="email" placeholder="you@brand.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </Field>
            <Field>
              <Label>
                <Mail className="mr-1 inline h-3 w-3" />
                Phone *
              </Label>
              <Input type="tel" placeholder="+91 90000 00000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </Field>
            <Field>
              <Label>
                <Building2 className="mr-1 inline h-3 w-3" />
                Company
              </Label>
              <Input placeholder="Acme Coffee Co." value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
            </Field>
            <Field className="sm:col-span-2">
              <Label>
                <Link2 className="mr-1 inline h-3 w-3" />
                Website (if any)
              </Label>
              <Input type="url" placeholder="https://acme.coffee" value={clientWebsite} onChange={(e) => setClientWebsite(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader step="5" icon={<Briefcase className="h-4 w-4" />} title="Scope (optional)" subtitle="Helps the designer scope timing and price accurately." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>
                <Calendar className="mr-1 inline h-3 w-3" />
                Deadline (if any)
              </Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field>
              <Label>
                <Wallet className="mr-1 inline h-3 w-3" />
                Budget you have in mind
              </Label>
              <Input type="number" placeholder="e.g. 15000" value={budget} onChange={(e) => setBudget(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">In {currency}. Optional — helps your designer suggest the right scope.</p>
            </Field>
            <Field className="sm:col-span-2">
              <Label>References (one per line)</Label>
              <Textarea
                placeholder={"https://example.com/inspiration\nhttps://dribbble.com/..."}
                value={references}
                onChange={(e) => setReferences(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Order summary</CardTitle>
            <Badge variant="accent">PUBLIC</Badge>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label={pkg?.name ?? "—"} value={pkg ? formatMoney(pkg.priceMinor, pkg.currency) : "—"} />
            {addons.filter((a) => selectedAddons.has(a.id)).map((a) => (
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
            Pricing locks once a designer reviews and you both approve.
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Button className="mt-5 w-full" variant="accent" size="lg" onClick={submit} loading={submitting}>
            Place order
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            We&apos;ll email you a private link to track everything. No signup needed.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function PostOrder({ code, magicLink }: { code: string; magicLink: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-5 w-5" />
          </span>
          <CardTitle>Order placed — {code}</CardTitle>
          <CardSubtitle className="max-w-md">
            A designer will pick this up shortly. You&apos;ll get an email with your private link too.
          </CardSubtitle>
        </div>
        {magicLink ? (
          <div className="mt-4 space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-accent" />
              Your private project link
            </div>
            <p className="text-xs text-muted-foreground">
              Bookmark this. It&apos;s the only thing you need to view your project, chat with your designer, approve milestones, and download deliverables.
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-2">
              <code className="flex-1 break-all text-xs">{magicLink}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(magicLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {magicLink ? (
            <a href={magicLink} className="inline-flex">
              <Button variant="accent">Open my project</Button>
            </a>
          ) : null}
          <a href="/" className="inline-flex">
            <Button variant="outline">Back to home</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

function SectionHeader({ step, icon, title, subtitle }: { step?: string; icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      {step ? (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
          {step}
        </span>
      ) : (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
      )}
      <div>
        <CardTitle className="flex items-center gap-1.5 text-base">
          {step ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </CardTitle>
        {subtitle ? <CardSubtitle className="mt-0.5">{subtitle}</CardSubtitle> : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Divider() {
  return <hr className="my-1 border-border" />;
}
