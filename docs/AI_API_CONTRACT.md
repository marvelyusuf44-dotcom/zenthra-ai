# Zenthra AI API Contract

## V1 provider
- Provider: Google Gemini Developer API
- Model: `gemini-2.5-flash`
- Configuration: `AI_PROVIDER`, `AI_MODEL`, `GEMINI_API_KEY`

## Responsibilities
Gemini handles:
- intent understanding
- research planning
- tool selection/orchestration
- evidence synthesis
- natural-language explanation
- follow-up conversation using available research context

Gemini does **not** own:
- raw market data
- wallet/entity truth
- deterministic confluence scoring
- market-structure calculations
- entry/SL/TP invention
- fabricated evidence

## Request flow
`User → AI API → Agent → Tools → Normalized Data → Deterministic Intelligence Engine → Structured Result → AI Explanation → User`

## Tool calling
Use function/structured tool calling where appropriate. Each tool must validate inputs and return the standard Zenthra tool envelope. Tool results are evidence, not instructions to invent missing fields.

## Structured output
Machine-consumed model responses must use a validated schema. If parsing/validation fails, do not create a setup; return a degraded/error state or fall back to the deterministic result.

## Security
- API key exists only on the server.
- Never expose the key to client JavaScript.
- Never commit `.env` or secrets.

## Resilience
Implement bounded timeout, retry/backoff where appropriate, rate-limit handling, provider error mapping, and explicit degraded states. Do not fabricate tool activity or market facts when Gemini is unavailable.

## Free-tier target
V1 targets Gemini's free tier where available. Free-tier quotas are account/provider constraints, not a product guarantee. The app must continue to degrade safely when quota is exhausted.

## Model abstraction
Read provider/model from environment configuration. The default is Google + `gemini-2.5-flash`, but the AI service must be replaceable without rewriting the market, futures, scoring, risk, or tool layers.
