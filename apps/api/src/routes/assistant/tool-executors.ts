import { ToolExecutor } from "./types";
import { buildUrl } from "./url";

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
  },
  async get_inactive_customers(args) {
    const days = args.days ?? 30;
    const limit = args.limit ?? 200;
    const segment = args.segment;
    let cursor = args.cursor ?? 0;

    const merged: any = {
      storeId: args.storeId,
      days,
      cutoff: null,
      count: 0,
      segmentCounts: {},
      data: [],
    };

    // Fetch up to 5 pages (cap 1000 rows at default limit 200)
    for (let i = 0; i < 5; i++) {
      const pageArgs = { ...args, days, limit, cursor, segment };
      const url = buildUrl("/customers/inactive", pageArgs);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`customers/inactive ${res.status}`);
      const json = await res.json();

      merged.cutoff = merged.cutoff || json.cutoff;
      merged.data.push(...(json.data || []));
      merged.count += json.count || 0;
      if (json.segmentCounts) {
        for (const [k, v] of Object.entries(json.segmentCounts)) {
          merged.segmentCounts[k] = (merged.segmentCounts[k] || 0) + (v as number);
        }
      }

      if (!json.nextCursor) break;
      cursor = json.nextCursor;
    }

    return merged;
  },
  async get_last_order(args) {
    const url = buildUrl("/customers/last-order", args);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`customers/last-order ${res.status}`);
    return res.json();
  },
  async get_winback_suggestion(args) {
    if (!args.customerId) throw new Error("customerId is required");
    const { customerId, ...rest } = args as any;
    const url = buildUrl(`/customers/${customerId}/winback`, rest);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`customers/winback ${res.status}`);
    return res.json();
  }
};
