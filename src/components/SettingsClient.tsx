"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, Select } from "@/components/ui/Input";
import { User as UserIcon, Settings as SettingsIcon, Check, AlertTriangle } from "lucide-react";

type Tab = "profile" | "account";

export function SettingsClient({
  user,
}: {
  user: { email: string; name: string; role: string; phone: string; timezone: string; bio: string };
}) {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Card className="p-2">
        <ul className="space-y-0.5 text-sm">
          <SettingsTab icon={<UserIcon className="h-4 w-4" />} label="Profile Information" active={tab === "profile"} onClick={() => setTab("profile")} />
          <SettingsTab icon={<SettingsIcon className="h-4 w-4" />} label="Account Settings" active={tab === "account"} onClick={() => setTab("account")} />
        </ul>
      </Card>
      <div className="space-y-6">
        {tab === "profile" ? <ProfileForm user={user} /> : <AccountForm />}
      </div>
    </div>
  );
}

function SettingsTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          active ? "bg-accent/15 text-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className={active ? "text-accent" : "text-foreground/50"}>{icon}</span>
        <span className="flex-1">{label}</span>
      </button>
    </li>
  );
}

function ProfileForm({
  user,
}: {
  user: { email: string; name: string; role: string; phone: string; timezone: string; bio: string };
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [timezone, setTimezone] = useState(user.timezone);
  const [bio, setBio] = useState(user.bio);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const initial = (name || user.email).slice(0, 1).toUpperCase();

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, timezone, bio }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Could not save");
      setMsg({ kind: "ok", text: "Profile updated" });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="text-base font-semibold tracking-tight">Profile Information</div>
          <div className="text-xs text-muted-foreground">Update your personal information.</div>
        </div>
        <Button variant="accent" size="sm" loading={busy} onClick={save}>Save changes</Button>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full accent-gradient text-xl font-semibold text-white shadow-md shadow-indigo-500/30">
          {initial}
        </span>
        <div>
          <div className="text-sm font-semibold">{name || user.email}</div>
          <div className="text-xs text-muted-foreground">{user.email} · {user.role.replaceAll("_", " ")}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field>
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field>
          <Label>Email</Label>
          <Input value={user.email} disabled />
        </Field>
        <Field>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
        </Field>
        <Field>
          <Label>Timezone</Label>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option>Asia/Kolkata</option>
            <option>UTC</option>
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Europe/Berlin</option>
            <option>Asia/Singapore</option>
            <option>Asia/Dubai</option>
            <option>Australia/Sydney</option>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <Label>Bio</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Tell us about yourself..."
          />
        </Field>
      </div>

      {msg ? (
        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {msg.kind === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      ) : null}
    </Card>
  );
}

function AccountForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (next.length < 8) return setMsg({ kind: "err", text: "New password must be at least 8 characters" });
    if (next !== confirm) return setMsg({ kind: "err", text: "New passwords do not match" });
    setBusy(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Could not update password");
      setCur("");
      setNext("");
      setConfirm("");
      setMsg({ kind: "ok", text: "Password updated" });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  return (
    <Card className="p-6">
      <div className="border-b border-border pb-4">
        <div className="text-base font-semibold tracking-tight">Account Settings</div>
        <div className="text-xs text-muted-foreground">Change your password.</div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label>Current password</Label>
          <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field>
          <Label>New password</Label>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" />
        </Field>
        <Field>
          <Label>Confirm new password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" />
        </Field>
      </div>
      {msg ? (
        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {msg.kind === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setCur(""); setNext(""); setConfirm(""); setMsg(null); }}>Cancel</Button>
        <Button size="sm" variant="accent" loading={busy} onClick={submit}>Update password</Button>
      </div>
    </Card>
  );
}
