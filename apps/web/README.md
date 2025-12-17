# WooAnalytics – Web App

Next.js frontend for WooAnalytics with live API data, insights cards, and a floating AI assistant.

## Features
- Dashboard (KPIs, popular products, top categories, recent orders)
- Analytics page (revenue/orders trends, segments, RFM, cohorts, refunds/discounts, shipping/tax, AOV, rolling/cumulative)
- Insights cards: peak revenue day, anomalies (30d), repeat purchase rates (30/90d), health ratios (refund/discount rates, net vs gross)
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
- Backend: `POST /assistant/query` (handled by the API, tool-calls existing analytics endpoints including peaks/anomalies/retention/health).
- Web: floating widget (bottom-right), uses store context + current filters, suggestions built-in, supports Ctrl+K to toggle.
- Ensure API envs set (`OPENROUTER_API_KEY`, `STORE_ID`, `INTERNAL_API_BASE`) and API is running.

## Notes
- Secrets (.env files) are not tracked; set envs locally.
- For data, ensure the API has a store and synced orders/products, or the assistant and insights will return zeros.
