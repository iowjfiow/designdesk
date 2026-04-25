// Tiny in-memory token-bucket rate limiter. Per-process; for a multi-instance
// deployment swap this for Redis (e.g. @upstash/ratelimit).

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { tokens: opts.max - 1, resetAt: now + opts.windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
  }
  if (existing.tokens <= 0) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.tokens -= 1;
  return { allowed: true, remaining: existing.tokens, resetAt: existing.resetAt };
}

export function clientKey(req: Request, suffix: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "anon";
  return `${ip}:${suffix}`;
}
