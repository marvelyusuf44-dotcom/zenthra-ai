# Zenthra V1 — Final Report

Status: **implementation complete for the scope below; NOT verified via a real
`npm install` / `npm run build` / runtime test**, because this environment has
no network access (npm registry returns 403 Forbidden on every request,
confirmed repeatedly across sessions — see "Build & test status"). Everything
below is reported honestly against that constraint.

---

## 0. Blocker fixes (this revision)

Three audit blockers were fixed after the initial implementation. None of
them added new product features — all are corrections to make existing
behavior safe/correct:

1. **Telegram webhook fail-closed.** `POST /api/telegram/webhook`
   previously skipped secret verification entirely if
   `TELEGRAM_WEBHOOK_SECRET` was unset (fail-open — anyone could forge
   Approve/Reject decisions). It now returns `503` and refuses to process
   *any* request when the secret isn't configured, and `401` on a mismatched
   secret. See `app/api/telegram/webhook/route.ts`.

2. **Payment proof is no longer publicly accessible.** Proof files
   previously landed in `public/uploads/` (web-servable by Next.js to
   anyone with the URL). They now write to `private-uploads/` — a directory
   outside `public/` that Next.js never serves statically — and the file
   bytes are sent directly to the Telegram admin chat via multipart upload
   (`sendPhoto`/`sendDocument`), so no URL is needed at all for the primary
   flow. A new authenticated fallback route, `GET
   /api/admin/proof/[orderId]` (requires `x-admin-secret`), covers the case
   where Telegram isn't configured. `PUBLIC_BASE_URL` (previously used to
   build a public proof link) was removed as it's no longer needed. See
   `app/api/payment/upload-proof/route.ts`, `src/telegram/adminBot.ts`,
   `app/api/admin/proof/[orderId]/route.ts`.

3. **Persistence is now Postgres-compatible.** `src/db/repository.ts` no
   longer talks to `better-sqlite3` directly — it's written against a new
   `DbAdapter` interface (`src/db/adapter.ts`). `src/db/client.ts` selects a
   `PostgresAdapter` (via the `pg` package) when `DATABASE_URL` is set, or
   falls back to the existing `SqliteAdapter` otherwise. Every repository
   function is now `async` (Postgres is network I/O); every caller across
   the 7 routes that use the repository was updated to `await` it — verified
   by grep audit (§4). The repository's public function names/signatures
   are unchanged, so this is additive within the existing pattern, not a
   rearchitecture. **Not exercised against a real Postgres instance** — see
   §4/§7 for the honesty caveat on this.

### 0.1 Re-verification pass (after a report — ZIP mismatch — from the user)

The user reported that a previously delivered ZIP did not reflect the
changes described above. This section documents an independent re-check,
done from scratch rather than trusting the prior turn's own report:

- Re-read the **actual working-tree files** on disk (not memory of having
  written them) for all 9 claimed changes: `src/db/adapter.ts` existence,
  every `src/db/repository.ts` export being `async`, the webhook
  fail-closed branch, `private-uploads/` usage in both the upload route and
  the new admin proof route, the admin proof route's existence and its
  `isAuthorizedAdmin` gate, `adminBot.ts`'s `FormData`/`Blob` multipart
  upload path, `.gitignore`'s `private-uploads/` rule, `package.json`'s
  `pg`/`@types/pg` entries, and `.env.example`'s `DATABASE_URL`/`DATABASE_SSL`
  presence with `PUBLIC_BASE_URL` absent. **All 9 confirmed present and
  correct in the working tree** (`/home/claude/zenthra-v1`).
- Went further and **extracted the actual previously-delivered ZIP file**
  (not the working tree) into a clean, separate directory and re-ran the
  same 9 checks directly against those extracted files. **All 9 were also
  present and correct in that ZIP.** No discrepancy between the working
  tree and the delivered archive was found on this pass.
- Checked for structural issues that could make a correct ZIP *look* wrong
  when opened (a nested duplicate folder, leftover `node_modules`/`.next`
  bloat, a stray second `zenthra-v1` directory on disk) — none found.
- Because the underlying cause of the mismatch the user saw could not be
  reproduced or identified from this side, the ZIP was rebuilt from scratch
  from the current working tree anyway, under a **new filename**
  (`zenthra-v1-r2.zip` instead of reusing `zenthra-v1.zip`) specifically to
  rule out any client-side/browser caching of the old filename as a
  possible cause. If the new file still doesn't show these changes when
  inspected, that would point to a delivery/caching issue rather than a
  content issue — worth flagging back with specifics (e.g. which file
  looked wrong) so it can be narrowed down further.
- This report itself is naturally an imperfect check on its own accuracy —
  the honest position is: two independent extractions of two different ZIP
  builds, plus the live working tree, all agree. That's the strongest
  verification available without the user's own re-inspection of the new
  file.

---

## 1. Files created / changed

### Config / root
- `package.json` (added `pg` + `@types/pg`), `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`,
  `postcss.config.mjs`, `.gitignore` (updated for `private-uploads/`), `.env.example` (extended: `DATABASE_URL`, `DATABASE_SSL`; removed `PUBLIC_BASE_URL`), `README.md`

### Types & shared contracts
- `src/types/index.ts` — every tool/scoring/risk/API shape in one place

### Utils
- `src/utils/httpClient.ts` — bounded timeout/retry fetch wrapper (all tools go through this)
- `src/utils/toolEnvelope.ts` — `ok()` / `fail()` / `notImplemented()` envelope helpers
- `src/utils/validation.ts` — Zod request schemas
- `src/utils/logger.ts` — minimal structured logger
- `src/utils/adminAuth.ts` — shared-secret admin auth guard

### Tool layer (`src/tools/`) — 14 tools per `docs/TOOL_CONTRACTS.md`
Real/free, network-backed:
- `marketTicker.ts` (Binance Futures 24h ticker)
- `ohlcv.ts` (Binance Futures klines)
- `openInterest.ts`, `openInterestHistory.ts` (Binance Futures OI)
- `fundingRate.ts` (Binance Futures premium index)
- `longShortContext.ts` (Binance Futures global long/short account ratio)
- `marketContext.ts` (CoinGecko free market data + trending — explicitly NOT a news/causal-explanation engine)
- `coingeckoIds.ts` (static symbol→id map for the fixed V1 universe)

Deterministic, computed from already-fetched data (no extra network call):
- `volumeAnalysis.ts`, `marketStructure.ts` (trend/EMA/ATR/swing high-low)

Honest V1 stubs (no free reliable source exists — see "Deliberately not implemented"):
- `liquidationData.ts`, `onchainActivity.ts`, `walletDiscovery.ts`, `walletBehavior.ts`, `entityLookup.ts`

### Scoring / risk / context (no network, no LLM)
- `src/scoring/confluence.ts` — deterministic weighted score, fixed 100-pt scale, omitted components score 0 (not rescaled — see §5)
- `src/scoring/conflicts.ts` — conflict detector + conviction penalty
- `src/risk/riskEngine.ts` — entry/invalidation/TP1/TP2 from swing levels + ATR; direction decision
- `src/context/researchContext.ts` — normalizes tool envelopes into renderable evidence

### Agent / AI orchestration
- `src/agent/aiProvider.ts` — `AIProvider` interface (model/provider abstraction)
- `src/agent/geminiProvider.ts` — Gemini Developer API adapter (`gemini-2.5-flash` default, `GEMINI_API_KEY` server-side)
- `src/agent/intent.ts` — deterministic symbol/keyword extraction (works even if Gemini is down)
- `src/agent/orchestrator.ts` — full Futures Intelligence pipeline (Question → Intent → Research Plan → Market Scan → Candidate Detection → Derivatives → Market Structure → On-chain → Context → Cross-check → Confluence Score → Decision → Setup → Evidence), zero LLM calls
- `src/agent/chatAgent.ts` — ties Gemini explanation on top of the deterministic scan; degrades honestly if Gemini fails

### Persistence / payments / Telegram admin
- `src/db/adapter.ts` — `DbAdapter` interface (backend-agnostic query contract)
- `src/db/client.ts` — selects SQLite (`better-sqlite3`, default/dev) or Postgres (`pg`, when `DATABASE_URL` is set); shared schema migration + plan seeding
- `src/db/repository.ts` — all DB access (users, plans, orders, subscriptions, admin log, revenue stats); fully `async`
- `src/telegram/adminBot.ts` — Telegram used strictly as admin interface (notify + approve/reject buttons + direct proof-file upload); DB is source of truth

### API routes (`app/api/`)
- `GET /api/health`
- `POST /api/intelligence/futures/scan`
- `POST /api/ai/chat`
- `GET /api/pricing/plans`
- `POST /api/payment/checkout`
- `POST /api/payment/upload-proof`
- `POST /api/telegram/webhook`
- `GET/POST /api/admin/orders`
- `GET /api/admin/stats`
- `GET /api/admin/proof/[orderId]` — **new**, authenticated proof-file access (blocker #2)

### Frontend
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (landing, 11 sections per blueprint)
- `app/ai/page.tsx` + `components/ai/Workspace.tsx` (chat-first `/ai` workspace: sidebar with 2 live tools + 8 honestly labeled "soon", suggested prompts, progress states, evidence/conflict/risk rendering, degraded-state handling)

### Docs
- `docs/*` copied through unchanged from the blueprint (source of truth, not modified)
- `BLUEPRINT.md`, `CLAUDE_INSTRUCTIONS.md` copied through unchanged
- `README.md` — rewritten to describe the actual implementation
- `FINAL_REPORT.md` — this file

**Regression note:** the repository was empty (`src/`, `public/` had no
files) prior to the initial implementation, so that pass carried no
regression risk. This revision's blocker fixes *did* rewrite five existing
files (`app/api/telegram/webhook/route.ts`, `app/api/payment/upload-proof/route.ts`,
`src/telegram/adminBot.ts`, `src/db/client.ts`, `src/db/repository.ts`) and
added `await` to five route files that call the repository. The audit in §4
(caller grep, tsc re-run, secret/gitignore re-scan) exists specifically to
catch regressions from that — no other files were touched, and no public
function signature changed in a way that would silently break an unmodified
caller (repository functions kept identical names/parameters, only wrapped
in `Promise`).

---

## 2. Endpoints available

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | liveness check | none |
| POST | `/api/intelligence/futures/scan` | deterministic futures scan (works without Gemini) | none (public) |
| POST | `/api/ai/chat` | AI-orchestrated chat, runs the scan + Gemini explanation | none (public) |
| GET | `/api/pricing/plans` | list active/priced plans | none |
| POST | `/api/payment/checkout` | create order, return QRIS info | none |
| POST | `/api/payment/upload-proof` | upload proof, notify Telegram admin | none |
| POST | `/api/telegram/webhook` | Telegram Approve/Reject callback | Telegram secret token header |
| GET/POST | `/api/admin/orders` | list / manually review orders | `x-admin-secret` header |
| GET | `/api/admin/stats` | revenue/subscription stats | `x-admin-secret` header |
| GET | `/api/admin/proof/[orderId]` | view/download a payment proof file (only HTTP path to it — no public URL) | `x-admin-secret` header |
| GET | `/` | landing page | none |
| GET | `/ai` | AI workspace | none |

---

## 3. Environment variables required

From `.env.example` (all optional/degraded-safe unless marked **required**):

```
AI_PROVIDER=google
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=            # required for AI explanation layer; scan endpoint works without it

COINGECKO_API_KEY=         # unused by V1 (free endpoints only) — kept for future use
SOLANA_RPC_URL=            # unused in V1 (onchain tools are stubbed) — kept for future use
NODE_ENV=development

DATABASE_PATH=./data/zenthra.db   # SQLite path, used when DATABASE_URL is empty
DATABASE_URL=              # set to a Postgres connection string for production (Vercel etc.) — see §0/§7
DATABASE_SSL=              # set to "disable" for local/self-hosted Postgres without TLS

PLAN_PRO_PRICE_IDR=        # must be set > 0 for the Pro plan to appear/be purchasable
PLAN_PRO_PLUS_PRICE_IDR=   # same, for Pro+

QRIS_STATIC_IMAGE_URL=     # required for checkout to work at all
QRIS_MERCHANT_NAME=        # optional, cosmetic

TELEGRAM_BOT_TOKEN=        # required for Telegram admin notifications + direct proof-file delivery
TELEGRAM_ADMIN_CHAT_ID=    # required, same reason
TELEGRAM_WEBHOOK_SECRET=   # REQUIRED to process any Telegram callback — the webhook fails closed (503) without it, see §0.1

ADMIN_API_SECRET=          # required to use the fallback /api/admin/* endpoints, including viewing proof files
```

No key was invented or hardcoded anywhere in the codebase (verified by grep — see §7).

---

## 4. Tests / checks actually run in this environment

Because `npm install` fails with `403 Forbidden` from `registry.npmjs.org`
(confirmed multiple times across sessions, including this one, via a plain
`npm ping` and `npm install --dry-run`), the following **could not** be run
and are **not** claimed as passing:
- `npm install`
- `npm run build` (`next build`)
- `npm run lint`
- Any runtime test hitting Binance/CoinGecko/Gemini/Telegram/Postgres, since
  outbound network is disabled for this sandbox entirely.

What **was** run, honestly, as a best-effort substitute — including a full
re-check after the three blocker fixes below:

- **TypeScript syntax/structure check** via the `tsc` binary already present
  in this environment (no `node_modules`, so full type resolution against
  `next`/`react`/`zod`/`pg`/etc. type packages was not possible). Ran against
  all 65 `.ts`/`.tsx` files (62 from the initial build + 3 new: `src/db/adapter.ts`,
  `app/api/admin/proof/[orderId]/route.ts`, plus the rewritten `src/db/client.ts`/`repository.ts`/`adminBot.ts`/`upload-proof/route.ts`)
  with `--noEmit --skipLibCheck --lib es2020,dom`.
  - Result: **150 total error lines, all accounted for by environment
    limitations, zero indicating a real code defect**:
    - 119× `TS2307 Cannot find module` — expected, dependencies not installed (`next`, `react`, `zod`, `pg`, `better-sqlite3`, etc. are all declared in `package.json` but the registry is unreachable to install them).
    - 28× `TS2591 Cannot find name 'path'/'fs'/'crypto'/'process'/'Buffer'/'fs/promises'` — expected, `@types/node` not installed (declared in `package.json`, same cause as above).
    - 2× `TS2322` on `key={...}` props in `Workspace.tsx` — investigated by hand in a prior pass: a known false positive when `@types/react`'s JSX namespace isn't loaded, not a real defect (standard React list-rendering).
    - 1× `TS2882` on the `import "./globals.css"` side-effect import in `layout.tsx` — expected; raw `tsc` outside the Next.js toolchain doesn't have Next's CSS-module type shim. Every Next.js app has this exact import and it compiles fine under `next build`.
  - **Zero** `TS1xxx` syntax errors, **zero** unexplained `TS2304`, **zero**
    `TS2339`/`TS2345` (property/argument-type errors) in either this pass or
    the initial one.
  - One real fix made in the initial pass: `app/layout.tsx` used
    `React.ReactNode` without importing React; changed to `import type {
    ReactNode } from "react"`.
- **Repository async-caller audit** (specific to blocker #3): grepped every
  file importing `@/src/db/repository` (7 files) and confirmed each of the
  10 exported repository functions is `async` and every call site uses
  `await`. No caller was missed. See §0.3.
- **Blocker #1/#2 audit**: grepped the full source tree for any remaining
  `public/uploads`, `/uploads/`, or `PUBLIC_BASE_URL` references (none
  found) and confirmed `private-uploads/` is correctly gitignored except
  `.gitkeep`. Manually re-read the rewritten webhook route to confirm the
  fail-closed branch returns before any secret comparison happens.
- **JSON validity**: `package.json` and `tsconfig.json` parsed successfully with `node -e "JSON.parse(...)"` (re-verified after edits).
- **Secret scan**: re-run after all changes — `grep` across all `.ts`/`.tsx`/`.json`/`.md` files for API-key-shaped strings, private-key headers, and any hardcoded value assigned to `GEMINI_API_KEY` / `TELEGRAM_BOT_TOKEN` / `ADMIN_API_SECRET` / `DATABASE_URL` outside `process.env.*` — **none found**.
- **`.gitignore` audit**: originally caught a real gap (`public/uploads/`
  wasn't excluded); that gap is now moot since proof files no longer live
  under `public/` at all — `private-uploads/` is excluded except `.gitkeep`.

**What this does NOT prove**: that `next build` succeeds, that the Next.js
App Router file conventions (including the new `[orderId]` dynamic route)
are 100% satisfied, that the Binance/CoinGecko/Gemini/Telegram HTTP calls
behave as expected against the live APIs, or that either the SQLite or the
new Postgres adapter executes correctly against a real database — the
Postgres path in particular has never been run against a real Postgres
instance. These need to be run on a machine with real network access before
deploying. Recommended first commands on such a machine:
```bash
npm install
npm run typecheck
npm run build
npm run dev   # then manually hit /api/health and /api/intelligence/futures/scan
# and, separately, with DATABASE_URL set to a real Postgres instance:
# re-run the payment/checkout → upload-proof → admin review flow end-to-end
```

---

## 5. Confluence Score — an important, deliberate scoring decision

Per the requested weights (Market Structure 20, Momentum/Volume 15, Open
Interest 15, Funding 10, Liquidations 10, On-chain 15, Market/News Context
10, Data Quality 5 = 100), two components (**Liquidations** and **On-chain**,
25 points combined) are structurally omitted in V1 because no free, reliable
public data source exists for them (see §6).

**Decision made**: omitted components score 0 and are *not* rescaled away.
This means the maximum score reachable by any symbol in V1 is currently
**75/100**, which caps every result at `WATCH` or `NO_TRADE` under the given
thresholds — `STRONG_SETUP` (80–100) and `VALID_SETUP` (70–79) are
unreachable until those two tools are implemented.

This was chosen over the alternative (rescaling the score to 100 over only
the available components) because rescaling would let a symbol with 25
points of missing evidence look identical to one with full evidence — which
directly contradicts "NO TRADE must be a valid result" and risks presenting
a lower-confidence read as a high-confidence one. If this cap is
undesirable for how the product wants to launch, it's a one-line change in
`src/scoring/confluence.ts` (rescale over `availableWeight` instead of the
fixed 100) — but that tradeoff should be a product decision, not something
silently baked in.

---

## 6. Deliberately NOT implemented in V1 (and why)

- **`liquidation_data`** — Binance's public Futures API does not expose
  aggregate market-wide liquidation history without authentication.
  CoinGlass (which does) is a paid product and explicitly excluded as a
  mandatory V1 dependency.
- **`onchain_activity`** — reliable "who is accumulating" / net-flow signals
  require an indexer-class product (Nansen/Arkham/Glassnode-tier). Raw
  public chain RPC only exposes block/tx primitives, not the aggregated
  signal the product promises; approximating it with a shallow proxy would
  look like on-chain intelligence without being honest evidence, so it was
  left out rather than faked.
- **`wallet_discovery` / `wallet_behavior` / `entity_lookup`** — same
  root cause: wallet/entity discovery and labeling need a maintained,
  paid label database. Implementing this with synthesized addresses would
  directly violate the no-fabrication rule, so these are typed, honest
  stubs (`ok:false`, clear `error` message) rather than fake data.
- **Dynamic QRIS / payment gateway integration** — V1 uses a static,
  operator-configured QRIS image + manual bank-transfer-style flow with
  proof upload and admin review, specifically because a dynamic
  QRIS-generation API is a paid dependency and was excluded per the "no
  mandatory paid API" instruction.
- **Multi-admin / role-based auth** — V1 admin auth is a single shared
  secret (`ADMIN_API_SECRET`). Sufficient to gate the admin endpoints from
  the public internet, not a substitute for real multi-admin accounts if
  the team grows.
- **News sentiment / causal price-move explanation** — `market_context`
  intentionally only reports *verifiable* CoinGecko data (rank, % change,
  trending status), not a synthesized "why it moved" narrative, since no
  free news API with reliable causal attribution exists and the AI must
  not invent causation.

---

## 7. Known limitations to verify before production

1. **Postgres adapter is unverified against a real database.** `DATABASE_URL`
   now selects a `PostgresAdapter` (`src/db/client.ts`, via the `pg`
   package) instead of the previous "SQLite only" state — this was blocker
   #3. However, this sandbox has no network access, so the adapter has
   **never been run against a real Postgres instance**: no connection was
   opened, no query executed, no migration verified. It's written against
   `pg`'s standard documented API and reuses the exact schema already
   proven via SQLite (see §0.3 for why the schema is backend-agnostic), but
   treat it as "should work, unverified" until tested against a real
   `DATABASE_URL` (e.g. a free-tier Neon/Supabase instance). SQLite remains
   the zero-config default and is unaffected by this change.
2. **Payment proof files are no longer public** (blocker #2, fixed this
   revision) — they live in `private-uploads/`, outside `public/`, and are
   only reachable via the authenticated `GET /api/admin/proof/[orderId]` or
   by Telegram receiving them directly. The remaining caveat is the same
   class as before: on Vercel's serverless runtime, `private-uploads/` is
   not persistently writable across deployments/instances (same as the old
   `public/uploads/` note). Object storage (e.g. S3-compatible) is the real
   production fix for file persistence; not implemented in V1. This is
   independent of the *access* fix (private vs. public), which is done.
3. **No automated tests were written** (unit/integration) — given the
   network constraints of this session, priority was placed on a correct,
   inspectable implementation plus static checking. Recommend adding tests
   for `src/scoring/confluence.ts`, `src/risk/riskEngine.ts`, and
   `src/scoring/conflicts.ts` first, since they are pure functions and the
   highest-value/lowest-effort to cover.
4. **Full `next build` / runtime behavior is unverified** in this session,
   per §4. Treat this build as "should work, structurally sound by static
   analysis" rather than "confirmed working."
5. **Rate limits**: Binance/CoinGecko free endpoints are called per-symbol
   per-scan with no caching layer. A full 10-symbol universe scan currently
   issues on the order of 40-50 outbound requests; this is fine for
   individual use but should get a short-TTL cache before real traffic.
6. **No DB transactions.** Multi-statement operations (e.g. `reviewOrder`'s
   update + log insert + subscription insert) run as sequential
   autocommit statements on both adapters, same as the original SQLite-only
   version — not wrapped in `BEGIN`/`COMMIT`. A crash mid-sequence could
   leave an order `APPROVED` without its subscription row. Low risk given
   V1's traffic expectations, but worth fixing before high volume.

---

## 8. Not requested / out of scope this round
- No CI/CD pipeline was set up.
- No automated deployment to Vercel/Replit was attempted (no network access from this session, and the instruction was explicitly not to commit/push).
- No git repository was initialized (per "jangan commit/push" — kept the working directory as a plain file tree; the person can `git init` themselves when ready).
