import { NextResponse, NextRequest } from "next/server";

// Security headers for all responses. These mirror common helmet defaults.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
  // CSP — allow Stripe.js + inline styles (Next sets some inline styles).
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.stripe.com",
    "font-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  // CSRF: for state-changing same-origin requests, require Origin to match host.
  const m = req.method.toUpperCase();
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
    // Stripe webhook is exempt — it's signed.
    if (!req.nextUrl.pathname.startsWith("/api/stripe/webhook")) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin) {
        try {
          const o = new URL(origin);
          if (o.host !== host) {
            return new NextResponse("CSRF: bad origin", { status: 403 });
          }
        } catch {
          return new NextResponse("CSRF: bad origin", { status: 403 });
        }
      }
    }
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
