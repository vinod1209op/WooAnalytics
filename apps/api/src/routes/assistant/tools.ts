export type ToolExecutor = (args: Record<string, any>) => Promise<any>;

export const ASSISTANT_MODEL =
  process.env.ASSISTANT_MODEL ||
  process.env.OPENROUTER_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4o-mini";

export const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  process.env.NEXT_PUBLIC_API_BASE ||
  `http://localhost:${process.env.PORT || 3001}`;

export const toolSchemas = [
  {
    name: "get_kpis",
    description: "Fetch KPI summary for a date range",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
        category: { type: "string" },
        coupon: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_sales",
    description: "Fetch sales timeseries",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_aov",
    description: "Fetch AOV timeseries",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_cumulative",
    description: "Fetch cumulative revenue/orders",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_rolling",
    description: "Fetch rolling revenue/orders",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_refunds_discounts",
    description: "Fetch refunds and discounts trend",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_shipping_tax",
    description: "Fetch shipping and tax trend",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_new_vs_returning",
    description: "Fetch new vs returning customers trend",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_top_products",
    description: "Fetch top products",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_top_categories",
    description: "Fetch top categories",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_segments",
    description: "Fetch customer segments",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_rfm",
    description: "Fetch RFM cells",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_retention_cohorts",
    description: "Fetch retention cohorts",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_performance_drop_products",
    description: "Fetch worst-performing products vs previous period",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_performance_drop_categories",
    description: "Fetch worst-performing categories vs previous period",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_health_ratios",
    description: "Fetch refund/discount rates and net/gross revenue",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_recent_orders",
    description: "Fetch recent orders",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_peak_day",
    description: "Fetch the peak revenue day in the range",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_anomalies",
    description: "Fetch recent revenue/order anomalies",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_retention_highlights",
    description: "Best and worst cohort retention",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_repeat_purchase_rates",
    description: "Repeat purchase rates for 30/90 days",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_high_value_orders",
    description: "Recent high-value orders",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        days: { type: "number" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_aging_orders",
    description: "Orders stuck in pending/processing beyond a threshold",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        days: { type: "number" },
        limit: { type: "number" }
      },
      required: ["storeId"]
    }
  }
];

export function buildUrl(path: string, params: Record<string, any>) {
  const url = new URL(path, INTERNAL_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export const toolExecutors: Record<string, ToolExecutor> = {
  async get_kpis(args) {
    const url = buildUrl("/kpis", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`kpis ${res.status}`);
    return res.json();
  },
  async get_sales(args) {
    const url = buildUrl("/sales", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sales ${res.status}`);
    return res.json();
  },
  async get_aov(args) {
    const url = buildUrl("/analytics/aov", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`aov ${res.status}`);
    return res.json();
  },
  async get_cumulative(args) {
    const url = buildUrl("/analytics/cumulative", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`cumulative ${res.status}`);
    return res.json();
  },
  async get_rolling(args) {
    const url = buildUrl("/analytics/rolling", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`rolling ${res.status}`);
    return res.json();
  },
  async get_refunds_discounts(args) {
    const url = buildUrl("/analytics/refunds-discounts", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`refunds-discounts ${res.status}`);
    return res.json();
  },
  async get_shipping_tax(args) {
    const url = buildUrl("/analytics/shipping-tax", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`shipping-tax ${res.status}`);
    return res.json();
  },
  async get_new_vs_returning(args) {
    const url = buildUrl("/analytics/new-vs-returning", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`new-vs-returning ${res.status}`);
    return res.json();
  },
  async get_top_products(args) {
    const url = buildUrl("/analytics/products/top", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`products/top ${res.status}`);
    return res.json();
  },
  async get_top_categories(args) {
    const withDefaults = {
      ...args,
      limit: args.limit ?? 10
    };
    const url = buildUrl("/categories/top", withDefaults);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`categories ${res.status}`);
    return res.json();
  },
  async get_segments(args) {
    const url = buildUrl("/segments", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`segments ${res.status}`);
    return res.json();
  },
  async get_rfm(args) {
    const url = buildUrl("/rfm", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`rfm ${res.status}`);
    return res.json();
  },
  async get_retention_cohorts(args) {
    const url = buildUrl("/analytics/retention/cohorts", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`retention/cohorts ${res.status}`);
    return res.json();
  },
  async get_performance_drop_products(args) {
    const url = buildUrl("/analytics/performance-drop/products", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`performance-drop/products ${res.status}`);
    return res.json();
  },
  async get_performance_drop_categories(args) {
    const url = buildUrl("/analytics/performance-drop/categories", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`performance-drop/categories ${res.status}`);
    return res.json();
  },
  async get_health_ratios(args) {
    const url = buildUrl("/analytics/health-ratios", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`health-ratios ${res.status}`);
    return res.json();
  },
  async get_recent_orders(args) {
    const withDefaults = {
      ...args,
      limit: args.limit ?? 10
    };
    const url = buildUrl("/orders/recent", withDefaults);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`orders ${res.status}`);
    return res.json();
  },
  async get_peak_day(args) {
    const url = buildUrl("/analytics/peaks", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`peaks ${res.status}`);
    return res.json();
  },
  async get_anomalies(args) {
    const url = buildUrl("/analytics/anomalies", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`anomalies ${res.status}`);
    return res.json();
  },
  async get_retention_highlights(args) {
    const url = buildUrl("/analytics/retention/highlights", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`retention/highlights ${res.status}`);
    return res.json();
  },
  async get_repeat_purchase_rates(args) {
    const url = buildUrl("/analytics/repeat-purchase", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`repeat-purchase ${res.status}`);
    return res.json();
  },
  async get_high_value_orders(args) {
    const url = buildUrl("/analytics/orders/high-value", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`orders/high-value ${res.status}`);
    return res.json();
  },
  async get_aging_orders(args) {
    const url = buildUrl("/analytics/orders/aging", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`orders/aging ${res.status}`);
    return res.json();
  }
};
