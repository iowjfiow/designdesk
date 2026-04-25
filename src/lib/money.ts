// Currency math is done entirely in minor units (paise / cents) using bigint-safe ints.
// We never represent money as floats. Splits are computed in basis points (bps; 1bps = 0.01%).

export const BPS_DENOMINATOR = 10_000;

export function bpsOf(amountMinor: number, bps: number): number {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer (minor units)");
  }
  if (bps < 0 || bps > BPS_DENOMINATOR) {
    throw new Error(`bps must be 0..${BPS_DENOMINATOR}, got ${bps}`);
  }
  // floor — never over-pay; remainder accrues as platform fee
  return Math.floor((amountMinor * bps) / BPS_DENOMINATOR);
}

export function formatMoney(amountMinor: number, currency = "INR"): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

/**
 * Split an escrow release into (designer, manager, platformFee) shares.
 * Exact allocation: designer = floor(total*designerBps/10000),
 * manager = floor(total*managerBps/10000), platformFee = remainder.
 * Guarantees: designer + manager + platformFee === total.
 */
export function splitEscrow(
  totalMinor: number,
  designerBps: number,
  managerBps: number,
): { designer: number; manager: number; platformFee: number } {
  if (designerBps + managerBps > BPS_DENOMINATOR) {
    throw new Error("designerBps + managerBps must be <= 10000");
  }
  const designer = bpsOf(totalMinor, designerBps);
  const manager = bpsOf(totalMinor, managerBps);
  const platformFee = totalMinor - designer - manager;
  return { designer, manager, platformFee };
}
