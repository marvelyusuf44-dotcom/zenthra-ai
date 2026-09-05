# Zenthra V1 — AI On-Chain Intelligence Platform

**Ask a question. Zenthra does the research.**

This repository implements Zenthra V1 per `BLUEPRINT.md`, `CLAUDE_INSTRUCTIONS.md`,
and `docs/`. See `FINAL_REPORT.md` for what was built, what was intentionally
left out, and what still needs manual verification (this environment could
not run `npm install` / `npm run build` — see that report for why).

## Two experiences
1. Public corporate website at `/` — professional company/intelligence presentation.
2. Zenthra AI application at `/ai` — AI-first intelligence workspace.

## First technical vertical slice: Futures Intelligence V1
Core loop: `Question → Discover → Investigate → Explain → Monitor`

Fully deterministic scoring/risk engine (`src/scoring`, `src/risk`) sits
behind `POST /api/intelligence/futures/scan` and works independently of the
AI layer. The AI layer (`src/agent`, Gemini `gemini-2.5-flash`) only
orchestrates and explains — it never invents prices, scores, or risk levels.

## V1.1 addition: Pricing, payment (QRIS + manual review), Telegram admin
- `GET /api/pricing/plans` — real plans from the database, hidden until an
  operator prices them (`PLAN_PRO_PRICE_IDR` / `PLAN_PRO_PLUS_PRICE_IDR`).
- `POST /api/payment/checkout` — creates an order, returns a static QRIS
  image (operator-configured, no paid payment gateway required for V1).
- `POST /api/payment/upload-proof` — user uploads payment proof; order moves
  to `PENDING_REVIEW`; Telegram admin chat is notified with Approve/Reject
  buttons.
- `POST /api/telegram/webhook` — Telegram callback handler. The database is
  always the source of truth; Telegram is only the admin interface.
- `GET/POST /api/admin/orders`, `GET /api/admin/stats` — authenticated
  fallback admin surface (works even if Telegram isn't configured).

See `FINAL_REPORT.md` for the SQLite-on-Vercel persistence caveat.

Payment proof bytes are stored in the durable `payment_proofs` database table
and are only served through the authenticated admin proof route. Legacy files
from older versions can still be read from `private-uploads/` when present.
For production, configure `DATABASE_URL` to a persistent PostgreSQL database.

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind. Replit → GitHub → Vercel → `zenthra.web.id`.

Operational target: Rp0 MVP using free/public data sources where appropriate.

### AI provider
V1 uses Google Gemini Developer API with `gemini-2.5-flash` as the default AI model. See `docs/AI_API_CONTRACT.md`.

## Getting started

### Replit

The Replit workflow runs the production server on `0.0.0.0:5000`:

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 5000
```

Open `/` for the public site, `/ai` for the intelligence workspace, and
`/api/health` to confirm the server is live.

### Local development (on a machine with internet access)

```bash
npm install
cp .env.example .env.local   # fill in the values you need
npm run dev -- --hostname 0.0.0.0 --port 5000
```

Then verify:
- `GET /api/health`
- `POST /api/intelligence/futures/scan` with `{"query": "Find interesting futures opportunities right now"}`
- `/` and `/ai`

## Environment variables
See `.env.example` for the full list and `FINAL_REPORT.md` for what's
required vs. optional per feature.
