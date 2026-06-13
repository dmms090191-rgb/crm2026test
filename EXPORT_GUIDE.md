# Talvex -- Export & Reinstall Guide

This guide covers everything needed to move Talvex to a new machine, a new Supabase project, or a new deployment host.

---

## 1. Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)
- A deployment host (Vercel, Netlify, etc.) -- optional for local dev

## 2. Clone & Install

```bash
git clone <your-repo-url> talvex
cd talvex
npm install
```

## 3. Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `VITE_APP_URL` | Your deployed URL (e.g. `https://my-app.vercel.app`) |
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public key |
| `VITE_VAPID_PUBLIC_KEY` | Generate with `npx web-push generate-vapid-keys` |

## 4. Supabase Setup

### 4a. Database (Migrations)

All table schemas, RLS policies, triggers, and functions are in the `supabase/migrations/` folder. Apply them in order through the Supabase SQL Editor or the MCP migration tool. Each file is numbered chronologically -- run them from lowest to highest.

### 4b. Edge Functions

There are 18 edge functions in `supabase/functions/`. Deploy each one using the Supabase Dashboard (Functions tab) or the Supabase MCP tool. Each function lives in its own folder with an `index.ts` entry point.

### 4c. Edge Function Secrets

Set these secrets in Supabase Dashboard > Edge Functions > Secrets:

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase |
| `SUPABASE_ANON_KEY` | Auto-set by Supabase |
| `VAPID_PRIVATE_KEY` | Web push signing key |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_SUBJECT` | `mailto:your-email@domain.com` |
| `ALLOWED_ORIGINS` | Comma-separated deploy URLs for CORS |

Other secrets depend on which integrations you use (Stripe, etc.).

## 5. Build & Run

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 6. Deploy

### Vercel
1. Import repo on Vercel
2. Set all `VITE_*` env variables in Vercel project settings
3. Deploy -- Vercel auto-detects Vite

### Netlify
1. Import repo, set build command to `npm run build`, publish dir to `dist`
2. Set all `VITE_*` env variables
3. Deploy

## 7. PWA Manifest

The app ships with a static `/manifest.webmanifest` in the `public/` folder. The Supabase edge function `pwa-manifest` can serve a dynamic manifest with company-specific icons -- this is optional and only relevant for multi-tenant custom domain setups.

## 8. What NOT to Do

- Do NOT hardcode Supabase project URLs in source files -- always use `import.meta.env.VITE_SUPABASE_URL`
- Do NOT hardcode deployment URLs -- always use `import.meta.env.VITE_APP_URL`
- Do NOT commit `.env` to version control (it is in `.gitignore`)
- Do NOT modify migration files after they have been applied -- create new migrations instead
- Do NOT skip RLS policies when creating new tables
