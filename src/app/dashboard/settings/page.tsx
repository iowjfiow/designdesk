import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, Select } from "@/components/ui/Input";
import {
  Bell,
  CreditCard,
  Database,
  Image as ImageIcon,
  Lock,
  Plug,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const me = await requireUser();
  const initial = (me.name ?? me.email).slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Tabs rail */}
        <Card className="p-2">
          <ul className="space-y-0.5 text-sm">
            <SettingsTab icon={<User className="h-4 w-4" />} label="Profile" active />
            <SettingsTab icon={<SettingsIcon className="h-4 w-4" />} label="Account" />
            <SettingsTab icon={<Bell className="h-4 w-4" />} label="Notifications" />
            <SettingsTab icon={<ImageIcon className="h-4 w-4" />} label="Appearance" />
            <SettingsTab icon={<CreditCard className="h-4 w-4" />} label="Billing" />
            <SettingsTab icon={<Plug className="h-4 w-4" />} label="Integrations" />
            <SettingsTab icon={<ShieldCheck className="h-4 w-4" />} label="Security" />
            <SettingsTab icon={<Database className="h-4 w-4" />} label="Data &amp; Privacy" />
          </ul>
        </Card>

        <div className="space-y-6">
          {/* Profile */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-base font-semibold tracking-tight">Profile Information</div>
                <div className="text-xs text-muted-foreground">Update your personal information and profile picture.</div>
              </div>
              <Button variant="accent" size="sm">Save changes</Button>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full accent-gradient text-xl font-semibold text-white shadow-md shadow-indigo-500/30">
                {initial}
              </span>
              <div>
                <div className="text-sm font-semibold">{me.name ?? me.email}</div>
                <div className="text-xs text-muted-foreground">{me.email} · {me.role.replaceAll("_", " ")}</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline">Upload new</Button>
                  <Button size="sm" variant="ghost">Remove</Button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field><Label>Full name</Label><Input defaultValue={me.name ?? ""} placeholder="Your name" /></Field>
              <Field><Label>Email</Label><Input defaultValue={me.email} disabled /></Field>
              <Field><Label>Phone</Label><Input placeholder="+91 ..." /></Field>
              <Field><Label>Timezone</Label>
                <Select defaultValue="Asia/Kolkata">
                  <option>Asia/Kolkata</option>
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>Europe/London</option>
                </Select>
              </Field>
              <Field className="sm:col-span-2"><Label>Bio</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Tell us about yourself..."
                />
              </Field>
            </div>
          </Card>

          {/* Account */}
          <Card className="p-6">
            <div className="border-b border-border pb-4">
              <div className="text-base font-semibold tracking-tight">Account Settings</div>
              <div className="text-xs text-muted-foreground">Manage your account credentials and security.</div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field><Label>Current password</Label><Input type="password" placeholder="••••••••" /></Field>
              <div />
              <Field><Label>New password</Label><Input type="password" placeholder="••••••••" /></Field>
              <Field><Label>Confirm new password</Label><Input type="password" placeholder="••••••••" /></Field>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium"><Lock className="h-3.5 w-3.5" /> Two-factor authentication</div>
                <div className="text-xs text-muted-foreground">Add an extra layer of security to your account.</div>
              </div>
              <Button size="sm" variant="outline">Enable 2FA</Button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost">Cancel</Button>
              <Button size="sm" variant="accent">Update password</Button>
            </div>
          </Card>

          {/* Notification preferences */}
          <Card className="p-6">
            <div className="border-b border-border pb-4">
              <div className="text-base font-semibold tracking-tight">Notification Preferences</div>
              <div className="text-xs text-muted-foreground">Choose what email and in-app notifications you receive.</div>
            </div>
            <div className="mt-4 space-y-1">
              <NotificationRow title="Project updates" description="When a milestone is submitted or approved." defaultOn />
              <NotificationRow title="Payment & escrow" description="When escrow funds, releases, or refunds happen." defaultOn />
              <NotificationRow title="Disputes" description="Whenever a dispute is raised or resolved on your projects." defaultOn />
              <NotificationRow title="Inbox orders" description="New public orders waiting in the inbox." defaultOn />
              <NotificationRow title="Weekly digest" description="Friday email with everything that happened this week." />
              <NotificationRow title="Marketing" description="Tips and product updates from the DesignDesk team." />
            </div>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            Need to delete your account? <Link href="https://docs.devin.ai" className="text-accent hover:underline">Read our policy</Link> first.
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          active ? "bg-accent/15 text-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className={active ? "text-accent" : "text-foreground/50"}>{icon}</span>
        <span className="flex-1" dangerouslySetInnerHTML={{ __html: label }} />
      </button>
    </li>
  );
}

function NotificationRow({ title, description, defaultOn }: { title: string; description: string; defaultOn?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 hover:bg-muted/30">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{description}</div>
      </div>
      <span className="relative inline-flex h-6 w-11 flex-none cursor-pointer rounded-full bg-muted transition-colors peer-checked:bg-accent">
        <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-foreground shadow transition-all peer-checked:left-[1.4rem] peer-checked:bg-white" />
      </span>
    </label>
  );
}
