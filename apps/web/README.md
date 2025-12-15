# WooAnalytics – Web App

Next.js frontend for WooAnalytics with live API data and an AI assistant chat widget.

## Features
- Dashboard (KPIs, popular products, top categories, recent orders)
- Analytics page (revenue/orders trends, segments, RFM, cohorts, refunds/discounts, shipping/tax, AOV, rolling/cumulative)
- Filters (date range, category, coupon)
- Floating AI Assistant (Ctrl+K toggle) that answers questions using the backend analytics endpoints

## Env
Create `apps/web/.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:3001   # or your deployed API
```
`NEXT_PUBLIC_STORE_ID` is optional; web uses `/stores/default` from the API.

## Run
```
pnpm install
cd apps/web
pnpm dev
```
Open http://localhost:3000

## AI Assistant
- Backend: `POST /assistant/query` (handled by the API, tool-calls existing analytics endpoints).
- Web: floating widget (bottom-right), uses store context + current filters, suggestions built-in, supports Ctrl+K to toggle.
- Ensure API envs set (`OPENROUTER_API_KEY`, `STORE_ID`, etc.) and API is running.

## Notes
- Secrets (.env files) are not tracked; set envs locally.
- For data, ensure the API has a store and synced orders/products, or the assistant will return zeros.
