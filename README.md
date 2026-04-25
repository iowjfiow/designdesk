# DesignDesk

A dual-mode freelance collaboration platform: structured pricing, escrowed payments, milestone-based releases, in-app chat, and full audit trail. Works **with a partner** (Client Manager who brings clients) or **solo** — same guardrails either way.

> Built as a single-repo MVP. Stripe Connect (Express) is wired in test mode for real escrow/transfer flows; a Razorpay Route adapter is scaffolded for India payouts.

## What's in the box

- **Dual-mode projects** — every project is tagged `SOLO` or `COLLAB`; pricing math, party model, and revenue split adapt automatically.
- **Structured pricing builder** (`/dashboard/projects/new`) — packages → add-ons → live total → tax → order locking. Prices freeze at lock-time and become a snapshot on the order.
- **Real escrow flow** — client pays into the platform balance via Stripe Payment Intents; funds release milestone-by-milestone via Stripe Transfers to connected accounts. Default split: Designer 60% / Manager 40% (configurable per project).
- **Milestones** — Concept (30%) / Revisions (30%) / Final (40%) auto-generated on lock; designer submits → client approves or requests revision (revision count enforced against package limit).
- **In-app chat** — hash-chained for tamper evidence, immutable, retained for audit.
- **Wallet & ledger** — every fund movement (escrow hold, release, platform fee, payout state) recorded as a `WalletEntry` row.
- **Disputes** — any party can raise a dispute; project enters `DISPUTED`, escrow releases halt until admin resolves.
- **Activity log** — every state-changing action is recorded with actor, project, ip, ua.
- **Notifications** — in-app + email stub adapter (swap in Resend/SES).
- **Security** — bcrypt(12) passwords, opaque session tokens hashed at rest, CSP, X-Frame-Options DENY, CSRF (origin check), per-route rate limits, Zod validation, signed Stripe webhooks, Prisma parameterized queries, server-only auth modules.

## Honest scope (what's **not** done yet)

- **Mobile app** — web is mobile-responsive but native iOS/Android is a separate build.
- **True end-to-end encryption of chat** — incompatible with admin dispute resolution. We use TLS in transit + at-rest encryption (DB-level, depends on your hosting).
- **MFA enrollment UI** — schema fields exist (`mfaEnabled`, `mfaSecret`); UI flow is a TODO.
- **Real malware scanning** — `lib/upload.ts` has a stub; plug ClamAV / VirusTotal before production.
- **DDoS / WAF** — relies on hosting provider (Cloudflare / Vercel).
- **Razorpay Route adapter** — interface scaffolded in `src/lib/payments/razorpay.ts`; methods throw until implemented.
- **Withdrawal flow** beyond Stripe Connect's built-in payouts schedule.

## Quick start

### 1. Install Postgres locally (or use a hosted one)

```bash
sudo apt-get install postgresql
sudo -u postgres createuser -s freelance --pwprompt   # password: freelance
sudo -u postgres createdb -O freelance freelance
```

### 2. Configure `.env`

```bash
cp .env.example .env
# edit DATABASE_URL, NEXTAUTH_SECRET, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, etc.
```

### 3. Install + migrate + seed

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Demo accounts (password `password123`):

| Role           | Email                |
| -------------- | -------------------- |
| Designer       | designer@example.com |
| Client Manager | manager@example.com  |
| Client         | client@example.com   |
| Admin          | admin@example.com    |

### 5. Wire up Stripe (test mode)

1. Get keys at <https://dashboard.stripe.com/test/apikeys>.
2. Set `STRIPE_SECRET_KEY=sk_test_...` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `.env`.
3. Forward webhooks locally:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the `whsec_...` and set `STRIPE_WEBHOOK_SECRET`.

4. As a Designer/Manager, hit **Wallet → Connect to Stripe** to onboard an Express account. Stripe gives you a hosted onboarding URL — fill the test details and you'll come back with `payouts_enabled=true`.
5. As a Client, go through a project flow: lock order → pay → designer accepts → designer uploads deliverable → designer submits → client approves → escrow share transfers to designer's connected account.

## End-to-end flow

```text
            ┌─────────────┐
            │  Designer   │ creates project (SOLO or COLLAB)
            └──────┬──────┘
                   │ select package + add-ons
                   ▼
            ┌─────────────┐
            │   Client    │ verifies + locks order (pricing FROZEN)
            └──────┬──────┘
                   │ pay via Stripe → platform escrow
                   ▼
       ┌───────────────────────┐
       │ Designer accepts work │
       └──────────┬────────────┘
                  │ uploads deliverable to milestone
                  ▼
       ┌───────────────────────┐
       │  Client approves      │ → Transfer split to Designer / Manager
       └──────────┬────────────┘
                  ▼
            COMPLETED + ledger entries written
```

## Architecture

| Layer            | Choice                                 | Why                                                          |
| ---------------- | -------------------------------------- | ------------------------------------------------------------ |
| Framework        | Next.js 14 App Router (TypeScript)     | One repo for SSR + API; fast iteration                       |
| DB               | Postgres + Prisma                      | Strong types end-to-end, easy migrations                     |
| Auth             | Custom (bcrypt + opaque session token) | No third-party dependency; SHA-256 of token stored in DB     |
| Payments         | Stripe Connect (Express)               | Real escrow via platform balance + Transfers                 |
| Payment fallback | Razorpay Route (adapter scaffolded)    | India payouts                                                |
| File storage     | Local FS in dev (`/uploads`)           | Swap to S3/GCS for prod; interface in `src/lib/upload.ts`    |
| Money            | Integer minor units + bps math         | No floats, no rounding drift; bps for splits and tax         |
| Audit            | `ActivityLog` + hash-chained chat      | Tamper-evident; survives DB row edits via the hash chain     |
| Security         | CSP, CSRF origin check, rate limits    | All baked into `src/middleware.ts` and per-route limiters    |

## Key files

- `prisma/schema.prisma` — full data model
- `src/lib/payments/provider.ts` — provider-agnostic surface
- `src/lib/payments/stripe.ts` — real Stripe Connect adapter
- `src/lib/payments/razorpay.ts` — Razorpay stub (TODO)
- `src/lib/escrow.ts` — milestone release math + transfer dispatch
- `src/lib/money.ts` — bps math, currency formatting, split math
- `src/middleware.ts` — security headers + CSRF
- `src/app/api/stripe/webhook/route.ts` — signed webhook handler

## Scripts

```bash
npm run dev         # next dev
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run db:migrate  # prisma migrate dev
npm run db:seed     # seed catalog + demo users
npm run db:reset    # wipe + re-migrate + re-seed (DEV ONLY)
```

## Deploying

- Push the repo to GitHub.
- Provision a managed Postgres (Neon, Supabase, RDS).
- Deploy to Vercel (or any Node host). Set the env vars listed in `.env.example`.
- Add the Stripe webhook endpoint pointing at `https://<your-host>/api/stripe/webhook`.
- For S3 uploads: implement `src/lib/upload.ts` against your bucket and signed URLs.

## License

MIT. Built as a starter; harden before you put real money through it.
