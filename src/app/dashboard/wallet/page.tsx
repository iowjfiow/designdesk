import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { ConnectButton } from "@/components/ConnectButton";

export default async function WalletPage() {
  const me = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: me.id } });
  const entries = await prisma.walletEntry.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { project: { select: { code: true, title: true, mode: true } } },
  });
  const summary = entries.reduce(
    (a, e) => {
      if (e.state === "available") a.available += e.amountMinor;
      else if (e.state === "pending") a.pending += e.amountMinor;
      else if (e.state === "locked") a.locked += e.amountMinor;
      return a;
    },
    { available: 0, pending: 0, locked: 0 },
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardSubtitle>Available</CardSubtitle><CardTitle className="mt-1">{formatMoney(summary.available)}</CardTitle></Card>
        <Card><CardSubtitle>Pending payout</CardSubtitle><CardTitle className="mt-1">{formatMoney(summary.pending)}</CardTitle></Card>
        <Card><CardSubtitle>In escrow</CardSubtitle><CardTitle className="mt-1">{formatMoney(Math.abs(summary.locked))}</CardTitle></Card>
      </div>

      {(me.role === "DESIGNER" || me.role === "CLIENT_MANAGER" || me.role === "ADMIN") ? (
        <Card>
          <CardTitle>Payouts</CardTitle>
          <CardSubtitle>
            Onboard via Stripe Connect (Express) to receive payouts to your bank account.
            {user?.payoutsEnabled ? " Payouts are enabled." : " Payouts are not yet enabled."}
          </CardSubtitle>
          <div className="mt-3"><ConnectButton enabled={!!user?.payoutsEnabled} accountId={user?.stripeAccountId ?? null} /></div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Ledger</CardTitle>
        <CardSubtitle>Every escrow movement, transfer and platform fee for full transparency.</CardSubtitle>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2">When</th>
              <th>Project</th>
              <th>Kind</th>
              <th>Amount</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No entries yet.</td></tr>
            ) : null}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-2">{new Date(e.createdAt).toLocaleString()}</td>
                <td>{e.project ? `${e.project.code} ${e.project.title}` : "—"}</td>
                <td><Badge variant="muted">{e.kind}</Badge></td>
                <td className={e.amountMinor < 0 ? "text-danger" : "text-success"}>
                  {formatMoney(e.amountMinor, e.currency)}
                </td>
                <td><Badge variant={e.state === "available" ? "success" : e.state === "pending" ? "warning" : "muted"}>{e.state}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
