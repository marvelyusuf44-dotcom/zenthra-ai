# DEPLOYMENT RUNBOOK

## Goal
Replit → GitHub → Vercel → `zenthra.web.id`

## 1. GitHub
Create a new empty repository and import this ZIP contents.
Push the project to `main`.

## 2. Replit
Import/open the GitHub repository in Replit.
Run:
- `npm install`
- `npm run dev`
- `npm run build`

Configure environment variables from `.env.example` only as needed.

## 3. Vercel
Import the GitHub repository into Vercel.
Deploy first to the Vercel-generated URL.
Verify:
- `/`
- `/ai`
- `/api/health`
- `/api/intelligence/futures/scan`

## 4. Domain
In Vercel project settings, add `zenthra.web.id` as the production domain.
Then configure the exact DNS records Vercel displays at the domain registrar.
Do not guess DNS records.

After DNS propagation verify:
- HTTPS
- `/`
- `/ai`
- `/api/health`
- futures scan

## 5. Production safety
Never commit `.env` or secrets.
Use Vercel environment variables for production secrets.
