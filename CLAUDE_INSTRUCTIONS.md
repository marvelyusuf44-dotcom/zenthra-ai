# CLAUDE IMPLEMENTATION INSTRUCTIONS

You are the implementation agent for Zenthra V1.

READ FIRST:
1. `BLUEPRINT.md`
2. `docs/TOOL_CONTRACTS.md`
3. `docs/ACCEPTANCE_CRITERIA.md`
4. `docs/DEPLOYMENT.md`

## Mandatory workflow

1. Audit the repository before editing.
2. Identify the actual framework/runtime and preserve it when reasonable.
3. Implement Futures Intelligence V1 backend first.
4. Test backend independently.
5. Implement `/ai` workspace.
6. Implement corporate landing page `/`.
7. Run build/checks.
8. Audit regressions.
9. Report changed files and remaining configuration.

## Product rules

- Zenthra discovers; wallet address is usually an output.
- AI is the primary interface, but tools remain accessible.
- Use Google Gemini Developer API with `gemini-2.5-flash` as the V1 AI model. Read `docs/AI_API_CONTRACT.md` before implementing AI.
- Keep the AI provider behind an adapter/service boundary; do not hard-code provider logic into the intelligence engine.
- Keep `GEMINI_API_KEY` server-side only and never commit it.
- Public site must look like a serious intelligence/financial technology company.
- Product app must look like a real data/intelligence workspace.
- Use only black, white and Zenthra blue as primary brand colors per blueprint.
- No generic AI template styling.
- No fake data, testimonials, customers, statistics or market facts.
- No paid API may be mandatory for MVP.
- No secret may be committed.
- No guaranteed profit claims.
- NO TRADE is valid.
- LLM does not invent scores or risk levels.
- Deterministic calculations belong outside the LLM.
- External requests need timeout/rate-limit/error handling.
- Preserve useful functionality only after auditing it; do not blindly merge legacy code.

## Required first implementation

`POST /api/intelligence/futures/scan`

Suggested input:
```
{ "query": "Find interesting futures opportunities right now" }
```

Suggested output:
```
{
  "ok": true,
  "query": "...",
  "timestamp": "...",
  "candidates": [],
  "setups": [],
  "noTrade": [],
  "dataQuality": {}
}
```

Do not return placeholder/fake setups as if they were real.

## Final report

Report:
- files created/changed
- endpoints added
- environment variables required
- commands to run
- tests actually run
- deployment requirements
- known limitations
- remaining manual configuration

Do not claim complete unless acceptance criteria were checked.
