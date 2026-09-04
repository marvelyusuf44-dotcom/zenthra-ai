# ACCEPTANCE CRITERIA

## Backend
- [ ] Server starts.
- [ ] `/api/health` works.
- [ ] `/api/intelligence/futures/scan` works for a valid request.
- [ ] Timeout and provider error handling exist.
- [ ] Candidate universe is limited to V1 assets.
- [ ] Scoring is deterministic.
- [ ] Conflict detection is deterministic.
- [ ] Risk levels are derived from structure/data.
- [ ] No fabricated data.
- [ ] No secrets committed.

## Futures
- [ ] Market scan precedes deep investigation.
- [ ] Price/OI/volume are interpreted together.
- [ ] Funding is contextual.
- [ ] On-chain is supporting evidence.
- [ ] Conflicts reduce conviction.
- [ ] NO TRADE can be returned.
- [ ] Score is 0–100.
- [ ] Component scores are inspectable.

## AI app
- [ ] `/ai` loads.
- [ ] Chat works.
- [ ] Suggested prompts work.
- [ ] Research progress reflects real operations.
- [ ] Futures results render.
- [ ] Evidence/conflicts render.
- [ ] Mobile layout works.

## Landing
- [ ] `/` loads.
- [ ] Corporate/intelligence visual identity.
- [ ] Introduction.
- [ ] Capabilities.
- [ ] Workflow.
- [ ] AI preview.
- [ ] Tier section.
- [ ] About.
- [ ] Contact.
- [ ] Footer/legal.
- [ ] CTA opens `/ai`.

## Deployment
- [ ] Production build passes.
- [ ] Vercel configuration works.
- [ ] Environment variables documented.
- [ ] GitHub-ready.
- [ ] Domain connection instructions documented.


## AI API
- [ ] Google Gemini Developer API is configured through environment variables.
- [ ] Default V1 model is `gemini-2.5-flash`.
- [ ] Gemini API key is server-side only.
- [ ] AI provider is isolated behind an adapter/service boundary.
- [ ] Tool calls use validated inputs and normalized outputs.
- [ ] Model output is schema-validated where machine-consumed.
- [ ] AI timeout/rate-limit/provider failures degrade safely.
- [ ] No fabricated data, score, identity, entry, stop-loss or take-profit is produced.
