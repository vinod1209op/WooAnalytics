# WooAnalytics Monorepo

Next.js dashboard + Express API + Inngest-powered worker for syncing WooCommerce data into Supabase/Postgres.

## Stack

- **apps/web** – Next.js 16 client-side dashboard (Tailwind, Recharts).
- **apps/api** – Express + Prisma REST API (stores, KPIs, sales, products, segments, etc.).
- **apps/worker** – Inngest/Express worker that talks to WooCommerce, upserts into Prisma, and computes analytics tables.
- **prisma/** – Shared Prisma schema targeting Supabase/Postgres.

## Requirements

- Node 18+
- `pnpm` 8+
- Supabase (or any Postgres) connection string for `DATABASE_URL`.
- WooCommerce REST credentials (`consumer_key`/`consumer_secret`).
- Inngest signing + event keys (free Hobby plan works).

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment variables**
   - Copy each example file and fill in real values:
     ```
     cp apps/api/.env.example apps/api/.env
     cp apps/web/.env.local.example apps/web/.env.local
     cp apps/worker/.env.example apps/worker/.env
     ```
   - `DATABASE_URL` should point to the same Supabase/Postgres instance for all packages.
   - `NEXT_PUBLIC_API_BASE` must match your API URL (`http://localhost:3001` for local dev).
   - Worker requires `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` plus Woo auth mode.

3. **Apply Prisma schema**
   ```bash
   pnpm prisma migrate deploy --schema prisma/schema.prisma
   pnpm --filter @wooanalytics/api prisma:generate
   pnpm --filter @wooanalytics/worker prisma:generate
   ```

4. **Seed Woo store credentials**
   ```bash
   pnpm --filter @wooanalytics/worker seed:store \
     "Store Name" \
     "https://your-woo-site.com" \
     "ck_xxxxxxxxx" \
     "cs_xxxxxxxxx" \
     "optional-webhook-secret"
   ```

## Local Development Workflow

### 1. Worker + Inngest

```bash
# Terminal 1 – start worker (handles /api/inngest)
pnpm --filter @wooanalytics/worker dev

# Terminal 2 – start Inngest dev server and register functions
npx inngest-cli@latest dev -u http://localhost:3333/api/inngest
```

- Trigger a sync event via the Inngest dashboard or CLI:
  ```bash
  # In dashboard: Events → Send event → woo/store.sync → {"storeId":"...", "full":true}
  ```
- The worker logs each phase (`Products synced`, `Orders synced`, analytics, etc.) while writing into Supabase.

### 2. API

```bash
pnpm --filter @wooanalytics/api dev
# Available at http://localhost:3001
```

### 3. Web dashboard

```bash
cd apps/web
pnpm dev
# http://localhost:3000, reads NEXT_PUBLIC_API_BASE
```

## Deployment Notes

- **API + Web (Vercel):**
  - Create two projects or use monorepo routing.
  - Set `DATABASE_URL` for the API project, `NEXT_PUBLIC_API_BASE` for the web project (`https://<api>.vercel.app`).
  - Redeploy both after updating env vars.

- **Worker (Inngest):**
  - Host the worker server somewhere reachable (Vercel serverless, Fly.io, Render, etc.).
  - Point the Inngest project’s Serve URL at `https://<worker-domain>/api/inngest`.
  - Configure cron / manual jobs inside Inngest as needed.

## Helpful Scripts

| Command | Description |
| --- | --- |
| `pnpm --filter @wooanalytics/worker dev` | Run the worker locally |
| `pnpm --filter @wooanalytics/worker seed:store` | Upsert Woo store credentials |
| `pnpm --filter @wooanalytics/worker typecheck` | Type-check worker |
| `pnpm --filter @wooanalytics/api dev` | Start API server |
| `pnpm --filter apps dev` (from `apps/web`) | Start Next.js dashboard |
| `pnpm prisma migrate deploy` | Apply Prisma schema |

## Repository Structure

```
apps/
  api/      Express + Prisma REST API
  web/      Next.js dashboard
  worker/   Inngest worker + Woo client + sync modules
prisma/     Shared Prisma schema
```

## Notes

- Worker syncs a 30-day window by default; trigger events with `{"full":true}` or `{"since":"YYYY-MM-DD"}` for deeper history.
- All Prisma writes are idempotent (`upsert`), so rerunning the worker just updates data.
- Keep `.env` files out of git (already ignored).

Happy hacking!
