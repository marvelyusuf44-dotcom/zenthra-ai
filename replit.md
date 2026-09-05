# Zenthra on Replit

## Run and preview

The project uses the existing Next.js 14 + TypeScript + Tailwind structure.
Replit is configured with one web workflow:

```bash
npm run start -- --hostname 0.0.0.0 --port 5000
```

The preview is served on port `5000`. For local development with hot reload:

```bash
npm run dev -- --hostname 0.0.0.0 --port 5000
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

The liveness endpoint is available at `/api/health`. The public site is at `/`
and the intelligence workspace is at `/ai`.

## Environment

Copy `.env.example` to `.env.local` when configuring optional features. The
deterministic futures scan can run without the Gemini key, while the AI
explanation layer needs `GEMINI_API_KEY`. Payment and Telegram admin features
also require their documented variables.

Never commit `.env.local`, database files, payment proofs, or provider
credentials.