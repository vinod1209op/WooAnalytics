# WooAnalytics Monorepo

Next.js dashboard + Express API + Inngest-powered worker for syncing WooCommerce data into Supabase/Postgres, now with an AI assistant chat that calls your analytics + idle/win-back endpoints.

## Stack

- **apps/web** – Next.js 16 client-side dashboard (Tailwind, Recharts) + floating AI chat widget (Ctrl+K to toggle).
- **apps/api** – Express + Prisma REST API (stores, KPIs, sales, products, segments, analytics, `/assistant/query` for the AI).
- **apps/worker** – Inngest/Express worker that talks to WooCommerce, upserts into Prisma, and computes analytics tables (default sync window now 2 days).
- **prisma/** – Shared Prisma schema targeting Supabase/Postgres.
- New analytics endpoints for insights: peak revenue day, anomalies, retention highlights, repeat purchase rates, health ratios, performance drops (products/categories), high-value orders, aging orders (all consumed by the AI and usable for UI cards).
- New customer idle/win-back endpoints: `/customers/inactive` (segments, metrics, churn risk, CSV with tags), `/customers/last-order`, `/customers/:id/winback`, `/customers/rfm-idle`, cron routes `/cron/idle-snapshot`, `/cron/idle-health`.
- Optional GHL sync: `/cron/idle-sync-ghl` upserts idle customers into GHL with tags; requires backend envs.

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
- API assistant envs: `OPENROUTER_API_KEY` (or compatible), optional `OPENROUTER_BASE_URL`, `STORE_ID` (or ensure `/stores/default` returns one).
- Optional GHL sync prep: `GHL_PIT` (Private Integration Token) and `GHL_LOCATION_ID` if you want to push idle segments/tags into GHL via `/cron/idle-sync-ghl`; keep backend-only.
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

### 1. Worker

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

- Assistant route: `POST /assistant/query` (uses analytics endpoints as tools; requires `OPENROUTER_API_KEY` and a valid `STORE_ID`).

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
  - Host the worker somewhere that supports longer-running processes (e.g., a small VM or container host), or run it locally for manual syncs.
  - Ensure env vars are set (`DATABASE_URL`, Woo creds, Inngest keys) and expose `/api/inngest` for Inngest to reach it.
  - Configure cron / manual jobs inside Inngest as needed.

## Helpful Scripts

| Command | Description |
| --- | --- |
| `pnpm --filter @wooanalytics/worker dev` | Run the worker locally |
| `pnpm --filter @wooanalytics/worker seed:store` | Upsert Woo store credentials |
| `pnpm --filter @wooanalytics/worker sync:full` | One-off full sync for the configured store (`STORE_ID`) |
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

- Worker syncs a 2-day window by default; trigger events with `{"full":true}` or `{"since":"YYYY-MM-DD"}` for deeper history.
- All Prisma writes are idempotent (`upsert`), so rerunning the worker just updates data.
- Keep `.env` files out of git (already ignored).

## Idle / win-back feature recap

- API:
  - `/customers/inactive` with metrics (ordersCount, LTV, daysSinceLast, churnRisk), segments (ONE_TIME/REPEAT/LOYAL for 30/60/90), category/segment/intent filters, CSV export with tags for GHL.
  - `/customers/:id/winback` returns segment, last order + items/categories, offer ladder, message templates, intent placeholder.
  - `/customers/rfm-idle` combines RFM tier + idle segment; `/cron/idle-snapshot` and `/cron/idle-health` for ops snapshots/alerts.
  - `/cron/idle-sync-ghl` (POST) to upsert idle contacts + tags into GHL; expects `storeId`, optional `days/segment`, uses `GHL_PIT` + `GHL_LOCATION_ID`.
  - `/cron/normalize-intent` (POST) to pull GHL quiz/custom-field answers, map to intent enums/tags plus messaging/safety tags, push tags/custom field back to GHL, and store normalized quiz meta on customers; supports `dryRun`/`limit`, optional `GHL_PRIMARY_INTENT_FIELD_ID`, debug helper `/cron/debug/ghl/contact/:id`.
- Web dashboard:
  - `/admin/idle` page with filters (days 30/60/90, segment, category, intent), segment cards (counts, avg days since, avg LTV, per-segment export), churn-risk sorting, CSV export, copy emails, tags column in CSV.
  - Idle table shows offers/messages, segments, LTV, last order items/categories/coupons.
- Assistant:
  - Updated prompt to avoid “top 5” defaults, show segment counts first, and link CSV when asked for “all idle customers.”

Happy hacking!
