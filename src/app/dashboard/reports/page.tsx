import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { Briefcase, CheckCircle2, CircleDollarSign, Clock, TrendingUp, Users } from "lucide-react";

export default async function ReportsPage() {
  const me = await requireUser();

  const baseWhere = { OR: [{ designerId: me.id }, { managerId: me.id }] };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [walletAll, walletThis, walletPrev, projects, projectsThis, projectsPrev, distinctClientsThis, distinctClientsPrev] = await Promise.all([
    prisma.walletEntry.findMany({ where: { userId: me.id } }),
    prisma.walletEntry.findMany({ where: { userId: me.id, createdAt: { gte: monthStart } } }),
    prisma.walletEntry.findMany({
      where: { userId: me.id, createdAt: { gte: prevMonthStart, lt: monthStart } },
    }),
    prisma.project.findMany({
      where: baseWhere,
      select: { status: true, archivedAt: true, clientContactId: true, createdAt: true, deadline: true },
    }),
    prisma.project.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
    prisma.project.count({
      where: { ...baseWhere, createdAt: { gte: prevMonthStart, lt: monthStart } },
    }),
    prisma.project.findMany({
      where: { ...baseWhere, createdAt: { gte: monthStart } },
      select: { clientContactId: true },
    }),
    prisma.project.findMany({
      where: { ...baseWhere, createdAt: { gte: prevMonthStart, lt: monthStart } },
      select: { clientContactId: true },
    }),
  ]);

  const earnings = walletAll.reduce((s, e) => (e.state === "available" ? s + e.amountMinor : s), 0);
  const earningsThis = walletThis.reduce((s, e) => (e.state === "available" ? s + e.amountMinor : s), 0);
  const earningsPrev = walletPrev.reduce((s, e) => (e.state === "available" ? s + e.amountMinor : s), 0);

  const totalProjects = projects.length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;
  const inProgress = projects.filter((p) =>
    ["IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"].includes(p.status as string),
  ).length;
  const onHold = projects.filter((p) =>
    ["DISPUTED", "AWAITING_PAYMENT", "AWAITING_APPROVAL"].includes(p.status as string),
  ).length;
  const cancelled = projects.filter((p) => p.status === "CANCELLED").length;
  const otherActive = totalProjects - completed - inProgress - onHold - cancelled;

  const activeClients = new Set(
    projects.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status as string)).map((p) => p.clientContactId),
  ).size;

  const clientsThis = new Set(distinctClientsThis.map((p) => p.clientContactId)).size;
  const clientsPrev = new Set(distinctClientsPrev.map((p) => p.clientContactId)).size;

  const earningsDelta = pctDelta(earningsThis, earningsPrev);
  const projectsDelta = pctDelta(projectsThis, projectsPrev);
  const clientsDelta = pctDelta(clientsThis, clientsPrev);

  // 30-day earnings sparkline / area: bucket into 30 day-keys
  const days: { date: Date; amount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({ date: d, amount: 0 });
  }
  for (const e of walletAll) {
    if (e.state !== "available") continue;
    const t = new Date(e.createdAt);
    t.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.date.getTime() === t.getTime());
    if (idx >= 0) days[idx].amount += e.amountMinor;
  }
  const max = Math.max(1, ...days.map((d) => d.amount));
  const W = 600;
  const H = 180;
  const points = days.map((d, i) => {
    const x = (i / (days.length - 1)) * W;
    const y = H - (d.amount / max) * (H - 16) - 8;
    return [x, y] as const;
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  // Donut for project status
  const total = Math.max(1, completed + inProgress + onHold + cancelled + otherActive);
  const slices: { label: string; value: number; color: string }[] = [
    { label: "Completed", value: completed, color: "#a78bfa" },
    { label: "In Progress", value: inProgress, color: "#34d399" },
    { label: "On Hold", value: onHold, color: "#fbbf24" },
    { label: "Cancelled", value: cancelled, color: "#9ca3af" },
    { label: "Other active", value: otherActive, color: "#60a5fa" },
  ];
  const cx = 90;
  const cy = 90;
  const r = 64;
  const strokeW = 18;
  const cir = 2 * Math.PI * r;
  let acc = 0;
  const arcs = slices.map((s) => {
    const len = (s.value / total) * cir;
    const dasharray = `${len} ${cir - len}`;
    const offset = -acc;
    acc += len;
    return { ...s, dasharray, offset };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs">
          <Clock className="h-3.5 w-3.5" /> Last 30 days
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="indigo"
          label="Total Earnings"
          value={formatMoney(earnings, "INR")}
          deltaPct={earningsDelta}
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          tone="emerald"
          label="Total Projects"
          value={String(totalProjects)}
          deltaPct={projectsDelta}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="amber"
          label="Completed"
          value={String(completed)}
          deltaPct={null}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          tone="sky"
          label="Active Clients"
          value={String(activeClients)}
          deltaPct={clientsDelta}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* Earnings chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold tracking-tight">Earnings Overview</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </div>
            <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs">This Month</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-44 w-full">
            <defs>
              <linearGradient id="earn-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1="0" x2={W} y1={(H / 4) * i + 8} y2={(H / 4) * i + 8} stroke="rgb(var(--border))" strokeDasharray="3 4" />
            ))}
            <path d={areaPath} fill="url(#earn-grad)" />
            <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            {[0, 7, 14, 21, 29].map((i) => (
              <span key={i}>{days[i]?.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            ))}
          </div>
        </Card>

        {/* Donut */}
        <Card className="p-5">
          <div className="text-base font-semibold tracking-tight">Project Status</div>
          <div className="mt-3 flex items-center gap-5">
            <svg viewBox="0 0 180 180" className="h-44 w-44">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--muted))" strokeWidth={strokeW} />
              {arcs.map((a, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={strokeW}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  strokeLinecap="butt"
                />
              ))}
              <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="600">
                {totalProjects}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
                Total
              </text>
            </svg>
            <ul className="flex-1 space-y-2 text-xs">
              {slices.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-foreground/80">{s.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.value} ({Math.round((s.value / total) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Summary table */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="text-base font-semibold tracking-tight">Reports Summary</div>
          <div className="text-xs text-muted-foreground">This month vs last month.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3">Metric</th>
                <th className="px-5 py-3">This Month</th>
                <th className="px-5 py-3">Last Month</th>
                <th className="px-5 py-3 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <SummaryRow icon={<CircleDollarSign className="h-4 w-4 text-emerald-300" />} label="Earnings" thisV={formatMoney(earningsThis, "INR")} prevV={formatMoney(earningsPrev, "INR")} deltaPct={earningsDelta} />
              <SummaryRow icon={<Briefcase className="h-4 w-4 text-violet-300" />} label="Projects created" thisV={String(projectsThis)} prevV={String(projectsPrev)} deltaPct={projectsDelta} />
              <SummaryRow icon={<Users className="h-4 w-4 text-sky-300" />} label="New clients" thisV={String(clientsThis)} prevV={String(clientsPrev)} deltaPct={clientsDelta} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function pctDelta(thisV: number, prevV: number): number | null {
  if (prevV === 0) return thisV === 0 ? 0 : null;
  return Math.round(((thisV - prevV) / prevV) * 100);
}

function StatCard({
  icon,
  tone,
  label,
  value,
  deltaPct,
}: {
  icon: React.ReactNode;
  tone: "indigo" | "emerald" | "amber" | "sky";
  label: string;
  value: string;
  deltaPct: number | null;
}) {
  const tones = {
    indigo: "bg-indigo-500/15 text-indigo-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    sky: "bg-sky-500/15 text-sky-300",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        {deltaPct == null ? null : (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            deltaPct >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}>
            <TrendingUp className={`h-3 w-3 ${deltaPct < 0 ? "rotate-180" : ""}`} />
            {deltaPct >= 0 ? "+" : ""}{deltaPct}%
          </span>
        )}
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  thisV,
  prevV,
  deltaPct,
}: {
  icon: React.ReactNode;
  label: string;
  thisV: string;
  prevV: string;
  deltaPct: number | null;
}) {
  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="inline-flex items-center gap-2">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm tabular-nums">{thisV}</td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">{prevV}</td>
      <td className="px-5 py-3.5 text-right">
        {deltaPct == null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              deltaPct >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
            }`}
          >
            <TrendingUp className={`h-3 w-3 ${deltaPct < 0 ? "rotate-180" : ""}`} />
            {deltaPct >= 0 ? "+" : ""}{deltaPct}%
          </span>
        )}
      </td>
    </tr>
  );
}
