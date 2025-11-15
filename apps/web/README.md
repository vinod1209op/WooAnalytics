<h1>WooAnalytics – WooCommerce Analytics Dashboard (Phase 1)</h1>

<p>
  <strong>WooAnalytics</strong> is a modern analytics dashboard UI for WooCommerce stores.
  This is <strong>Phase 1</strong> of the project: a fully responsive frontend built with
  Next.js 15 and mock data. It’s focused on layout, UX, and chart interactions.
  In later phases we’ll connect it to a real API, database, and worker process.
</p>

<hr />

<h2>✨ Features (Phase 1)</h2>

<ul>
  <li>Dashboard homepage with:
    <ul>
      <li>Key KPIs: Revenue, Orders, AOV, Units Sold, Customers</li>
      <li>Popular products table with price, units sold, and revenue</li>
    </ul>
  </li>
  <li>Analytics page with:
    <ul>
      <li>Revenue trend chart</li>
      <li>Orders trend chart</li>
      <li>RFM distribution chart</li>
      <li>Customer segments chart</li>
    </ul>
  </li>
  <li>Global navbar with:
    <ul>
      <li>Links to <strong>Dashboard</strong> and <strong>Analytics</strong></li>
      <li>Dark / light theme toggle</li>
    </ul>
  </li>
  <li>Filter bar with:
    <ul>
      <li>Date range filter (From / To)</li>
      <li>Category filter (UI ready)</li>
      <li>Coupon filter (UI ready)</li>
    </ul>
  </li>
  <li>Mock-data hooks so the UI behaves like a real app (filters change the charts and KPIs).</li>
</ul>

<hr />

<h2>🧱 Tech Stack</h2>

<ul>
  <li><strong>Framework:</strong> Next.js (App Router)</li>
  <li><strong>Language:</strong> TypeScript</li>
  <li><strong>Package manager:</strong> pnpm</li>
  <li><strong>Styling:</strong> Tailwind CSS</li>
  <li><strong>UI:</strong> Custom components + basic shadcn/ui setup</li>
  <li><strong>Charts:</strong> recharts</li>
  <li><strong>Icons:</strong> lucide-react</li>
</ul>

<hr />

<h2>📁 Project Structure (Phase 1)</h2>

<pre>
apps/
  web/
    app/
      layout.tsx          - Root layout (theme provider, navbar, shell)
      page.tsx            - Dashboard page (KPIs + Popular products)
      analytics/
        page.tsx          - Analytics page (charts: revenue, orders, RFM, segments)

    components/
      layout/
        navbar.tsx        - Top navigation bar + dark mode toggle

      dashboard/
        kpi-row.tsx       - Row of KPI cards
        kpi-card.tsx      - Single KPI card
        popular-products-table.tsx - Popular products table

      analytics/
        revenue-chart.tsx - Revenue line chart
        orders-chart.tsx  - Orders bar chart
        rfm-chart.tsx     - RFM distribution chart
        segments-chart.tsx - Customer segments chart

      filters/
        filter-bar.tsx    - Filter bar (type + date range + category/coupon)

      theme/
        dark-toggle.tsx   - Dark / light mode switch
        theme-provider.tsx - Theme context wrapper

    hooks/
      useHasMounted.ts    - Prevents hydration mismatch for client-only UI
      useKpis.ts          - Mock KPI data, reacts to filters
      useSalesSeries.ts   - Mock timeseries for revenue/orders
      useSegments.ts      - Mock customer segments data
      useRfm.ts           - Mock RFM buckets data
      useMetaFilters.ts   - Mock category / coupon lists

    lib/
      api.ts              - Helper for building API URLs (future real API)
      date.ts             - Date utilities (parse/format helpers)
      money.ts            - Currency formatting helpers

    types/
      kpi.ts              - KPI types
      product.ts          - Product types
      sales.ts            - Sales timeseries types
      segment.ts          - Segment types
      rfm.ts              - RFM chart types
</pre>

<hr />

<h2>🚀 Getting Started (Local Development)</h2>

<h3>1. Clone the repository</h3>

<pre>
git clone https://github.com/&lt;your-username&gt;/WooAnalytics.git
cd WooAnalytics
</pre>

<h3>2. Install dependencies (with pnpm)</h3>

<pre>
pnpm install
</pre>

<h3>3. Run the web app</h3>

<p>
  The frontend lives in <code>apps/web</code>.
</p>

<pre>
cd apps/web
pnpm dev
</pre>

<p>
  Then open: <code>http://localhost:3000</code>
</p>

<hr />

<h2>🌗 Theme & Filters (Phase 1 Behavior)</h2>

<ul>
  <li>Dark / light mode:
    <ul>
      <li>Toggle in the navbar.</li>
      <li>Uses a theme provider and stores preference in <code>localStorage</code>.</li>
    </ul>
  </li>
  <li>Filters:
    <ul>
      <li>Changing date range, category, or coupon updates the mock KPI and chart data.</li>
      <li>All filter logic lives inside the custom hooks (<code>useKpis</code>, <code>useSalesSeries</code>, etc.).</li>
      <li>No real API calls yet in Phase 1.</li>
    </ul>
  </li>
</ul>

<hr />

<h2>📦 Environment Variables (Phase 1)</h2>

<p>
  Phase 1 only uses mock data on the client, so there are no required environment variables yet.
  In Phase 2+ we will introduce:
</p>

<ul>
  <li><code>NEXT_PUBLIC_API_BASE</code> – URL of the backend API</li>
  <li><code>NEXT_PUBLIC_STORE_ID</code> – Store identifier</li>
</ul>

<p>
  When we wire up the real API, these will be documented in more detail.
</p>

<hr />

<h2>🗺️ Roadmap</h2>

<h3>Phase 1 (this version)</h3>
<ul>
  <li>✅ Frontend layout for Dashboard &amp; Analytics</li>
  <li>✅ Dark mode + basic theming</li>
  <li>✅ Mock data for KPIs, charts, and segments</li>
</ul>

<h3>Phase 2 – Real Data &amp; Backend</h3>
<ul>
  <li>Connect frontend hooks to a real REST API (Express / Next API routes)</li>
  <li>Use a Postgres database (likely Supabase) for persistent data</li>
  <li>Sync WooCommerce orders, customers, products, coupons, subscriptions</li>
  <li>Compute real RFM scores and customer segments on the backend</li>
</ul>

<h3>Phase 3 – Background Jobs &amp; Integrations</h3>
<ul>
  <li>Background worker to periodically sync data from WooCommerce</li>
  <li>Redis / Upstash for job queues and caching</li>
  <li>Optional Notion or BI tool integrations</li>
</ul>

<hr />

<h2>🤝 Contributing / Supervisor Notes</h2>

<ul>
  <li>This repo currently represents <strong>Phase 1 (frontend-only)</strong>.</li>
  <li>The code is structured so that:
    <ul>
      <li>The UI is separated into clear components (layout, dashboard, analytics, filters, theme).</li>
      <li>Data logic lives in hooks and can be swapped from mock data to real API responses later.</li>
    </ul>
  </li>
  <li>Next steps will focus on:
    <ul>
      <li>Adding a backend API and database</li>
      <li>Reusing the same filter types and hooks against real endpoints</li>
    </ul>
  </li>
</ul>

<hr />

<h2>📄 License</h2>

<p>
  This project is currently private for internship / internal use.
  License can be updated later if we decide to open source it.
</p>
