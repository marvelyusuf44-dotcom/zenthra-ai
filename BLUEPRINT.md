# ZENTHRA V1 MASTER BLUEPRINT

## 1. Brand and product

**Name:** Zenthra
**Positioning:** AI Intelligence Platform / AI Agent for On-Chain Intelligence
**Tagline:** Intelligence for the On-Chain World.
**Promise:** Ask a question. Zenthra does the research.

Zenthra should discover information the user did not know to search for. Wallet addresses are normally outputs, not prerequisites.

Example questions:
- Who is accumulating SOL right now?
- What are whales buying this week?
- Find unusual on-chain activity today.
- Why is this token suddenly moving?
- Are there interesting futures setups right now?

## 2. Two-layer website architecture

### Public corporate website `/`
Purpose: introduction, trust, capabilities, workflow, tiers, about, contact and conversion.

Sections:
1. Header/navigation
2. Hero/introduction
3. What Zenthra is
4. Intelligence capabilities
5. AI chat preview/entry point
6. Workflow
7. Product capabilities
8. Pricing/tier concept
9. About
10. Contact
11. Footer/legal

Visual direction: serious technology / financial intelligence company. Premium black/white/blue palette. Strong typography, restrained motion, data-oriented visuals. Avoid generic AI SaaS template aesthetics, excessive gradients, fake metrics, fake testimonials and fake logos.

### Zenthra AI `/ai`
Actual product. AI-first workspace with sidebar/tool navigation.

Suggested tools:
- AI Research
- Discover
- Futures
- Markets
- Smart Money
- Wallets
- Entities
- Signals
- News
- Monitor

## 3. Color system

Primary palette is locked:
- Deep Black: `#05070A`
- White: `#F5F7FA`
- Zenthra Blue: `#2563EB`
- Bright Blue: `#3B82F6`
- Soft Blue: `#0F274D`
- Dark Surface: `#11161D`
- Border: `#202731`
- Muted Text: `#8B95A3`

Black = foundation. White = typography. Blue = brand/accent/actions/intelligence. Gray = surfaces/structure.

Blue must be an accent, not the entire UI.

Semantic status colors may be used sparingly: green for supportive/bullish, red for bearish/risk, gray for neutral/unavailable.

## 4. AI workspace UX

Empty state: “What would you like to investigate?”

Suggested prompts:
- Who is accumulating SOL right now?
- Find unusual activity today.
- Why is ETH moving?
- Find interesting futures opportunities.

Research progress should show real tool steps only. Never claim an action happened if it did not.

## 5. Futures Intelligence V1

Workflow:
USER QUESTION → INTENT → RESEARCH PLAN → MARKET SCAN → CANDIDATE DETECTION → DERIVATIVES → MARKET STRUCTURE → ON-CHAIN → CONTEXT → CROSS-CHECK → CONFLUENCE SCORE → LONG / SHORT / NO TRADE → SETUP → EVIDENCE → EXPLANATION → MONITOR

Initial universe:
BTC, ETH, SOL, BNB, XRP, DOGE, SUI, AVAX, LINK, ADA

Classification:
- 80–100 STRONG SETUP
- 70–79 VALID SETUP
- 55–69 WATCH
- <55 NO TRADE

These are confluence classifications, not probabilities of profit. NO TRADE is a valid first-class result.

### Confluence weights
| Factor | Weight |
|---|---:|
| Market Structure | 20 |
| Momentum + Volume | 15 |
| Open Interest | 15 |
| Funding | 10 |
| Liquidations | 10 |
| On-chain | 15 |
| Market/News Context | 10 |
| Data Quality | 5 |
| Total | 100 |

Scoring must be deterministic outside the LLM. Component scores and evidence must be inspectable.

## 6. Conflict detector

Conflicting evidence must reduce conviction and be shown. Example: bullish price structure + rising OI + crowded funding + on-chain distribution = mixed evidence, not an artificially strong LONG.

## 7. Risk engine

For valid setups return:
- direction
- entry zone
- invalidation
- TP1
- TP2
- risk/reward
- supporting evidence
- conflicting evidence

Levels must be derived from actual market structure/data. LLM must not invent arbitrary numbers.

## 8. Tool contracts

Every tool follows:
`Tool → Input → Output → When called → Allowed inference → Failure fallback`

Core tools:
- `market_ticker(symbol)` → price/change/volume → market scan → basic activity → skip symbol on failure
- `ohlcv(symbol,timeframe,limit)` → candles → candidate → trend/structure inputs → retry/alternate timeframe
- `volume_analysis(symbol,candles)` → relative volume → candidate → abnormal activity → lower confidence
- `open_interest(symbol)` → OI → candidate → positioning context → reduce data quality
- `open_interest_history(symbol,timeframe)` → OI series → deep investigation → OI expansion/contraction → current OI only
- `funding_rate(symbol)` → funding → deep investigation → crowding/context → omit
- `liquidation_data(symbol,timeframe)` → liquidations if available → deep investigation → squeeze context → omit
- `long_short_context(symbol)` → public positioning context → deep investigation → bias only → omit
- `market_structure(symbol,candles,timeframe)` → trend/levels/volatility → deep investigation → structure/risk → no setup if unreliable
- `onchain_activity(asset,chain)` → public activity → candidate → supporting evidence → omit
- `wallet_discovery(asset,criteria)` → candidate wallets/entities → discovery → candidates only, not guaranteed intent → omit
- `wallet_behavior(wallet,asset,timeframe)` → activity/behavior → wallet candidate → historical behavior → omit
- `entity_lookup(address)` → supported label/entity → attribution only → show address if unavailable
- `market_context(symbol,timeframe)` → verified context/news → abnormal movement/explanation → contextual explanation → explicitly state unavailable

Universal tool response fields: `ok`, `source`, `timestamp`, normalized `data`, optional `error`, optional `dataQuality`.

No tool may fabricate data.

## 9. Data strategy

Prefer free/public sources for MVP:
- Binance public market/futures endpoints where permitted
- public blockchain RPC / existing Zenthra intelligence endpoints
- CoinGecko Demo for metadata/market data where appropriate
- legally usable public context/news sources

CoinGlass is NOT a required V1 dependency because its API is paid.

All providers require timeout, error handling, rate-limit handling, normalized output and source metadata.

## 10. Backend

Recommended structure:
```
src/
  agent/       # orchestrator, intent, research plan
  tools/       # market, futures, on-chain, context, entities
  scoring/     # confluence, conflicts
  risk/        # structure, setup
  context/     # normalization / research context
  routes/      # API routes
  utils/       # validation, HTTP, logging
```

Primary endpoint:
`POST /api/intelligence/futures/scan`

Health:
`GET /api/health`

Future routes:
`POST /api/ai/chat`
`POST /api/intelligence/discover`
`POST /api/intelligence/research`
`POST /api/intelligence/monitor`

The futures engine must work independently from the chat UI.

## 11. AI API contract

Primary AI provider for V1: **Google Gemini Developer API**.
Primary model: **`gemini-2.5-flash`**.

The model is used as the AI/orchestration layer for: intent understanding, research planning, tool selection, tool orchestration, evidence synthesis, and natural-language explanation. Gemini must not be treated as the source of truth for raw market data, wallet identity, deterministic scores, or risk levels.

### Configuration
- `AI_PROVIDER=google`
- `AI_MODEL=gemini-2.5-flash`
- `GEMINI_API_KEY=<server-side secret>`

The implementation must keep the provider behind an AI adapter/service boundary so the model can be changed without rewriting the intelligence engine. Never expose `GEMINI_API_KEY` to the browser and never commit secrets.

### Tool calling
The AI layer may request Zenthra tools through structured/function-calling interfaces. Tool results must be normalized before being returned to the model. The model may decide **which** tool is needed, but the tool implementation remains responsible for obtaining and validating actual data.

### Structured outputs
Where machine-readable decisions are required, prefer schema-constrained/structured output. The backend must validate model output before using it. Invalid model output must not become a trading setup.

### Failure policy
- Missing API key: AI chat is unavailable; deterministic intelligence endpoints may still operate independently.
- Provider timeout/error/rate limit: retry only within a bounded policy, then return an explicit unavailable/degraded state.
- AI failure after tools completed: return the structured deterministic result with a concise non-AI fallback where possible.
- Never fabricate a successful tool call or market finding to hide an AI/provider failure.

### Cost and safety
V1 should target the Gemini free tier where available and avoid paid AI features as a mandatory dependency. Free-tier quotas are not guaranteed for every deployment/account; the application must handle quota exhaustion gracefully.

Google currently documents `gemini-2.5-flash` as a stable model with function calling and structured outputs, suitable for agentic and low-latency workloads. Treat the model ID as configuration, not hard-coded business logic.

## 11. AI behavior

The LLM is an orchestrator and explanation layer, not the source of truth for raw market data, scores, identities, prices or risk levels.

Response structure:
- Finding
- Evidence
- Interpretation
- Conflict
- Decision
- Risk

Never use guaranteed-profit language or unsupported probabilities.

Follow-up questions should reuse relevant research context where available.

## 12. Tiers

Commercial tiers are hypotheses only:
- Free — limited core intelligence
- Pro — deeper research, futures, smart money, monitoring
- Pro+ — advanced research and higher limits

Do not implement payment before customer validation.

## 13. V1 non-goals

Do not build an exchange, trading execution, thousands-asset scan, every blockchain, complex auth, payment, mandatory paid APIs, or a giant dashboard before the intelligence engine works.

Do not import old Zenthra code blindly.

## 14. Definition of done

- Health endpoint works.
- Futures scan endpoint accepts a request.
- Market scan uses actual data.
- Candidates are ranked.
- Derivatives context is used where available.
- Market structure is calculated from real candles.
- On-chain/context evidence is optional and honest.
- Conflicts are detected.
- Score is deterministic 0–100.
- LONG/SHORT/WATCH/NO TRADE can be returned.
- Risk levels are data-derived.
- Evidence is rendered.
- Tool failures degrade safely.
- No fabricated data.
- Landing page and `/ai` are visually distinct.
- Mobile and desktop work.
- Build/test passes.
- No secrets committed.
