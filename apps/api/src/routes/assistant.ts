import { Router, Request, Response } from "express";
import OpenAI from "openai";

type ToolExecutor = (args: Record<string, any>) => Promise<any>;

const ASSISTANT_MODEL =
  process.env.ASSISTANT_MODEL ||
  process.env.OPENROUTER_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4o-mini";
const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE || `http://localhost:${process.env.PORT || 3001}`;

const router = Router();

const toolSchemas = [
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
  }
];

function buildUrl(path: string, params: Record<string, any>) {
  const url = new URL(path, INTERNAL_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

const toolExecutors: Record<string, ToolExecutor> = {
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
  async get_recent_orders(args) {
    const withDefaults = {
      ...args,
      limit: args.limit ?? 10
    };
    const url = buildUrl("/orders/recent", withDefaults);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`orders ${res.status}`);
    return res.json();
  }
};

async function resolveStoreId(passed: string | undefined) {
  if (passed) return passed;
  if (process.env.STORE_ID) return process.env.STORE_ID;
  const res = await fetch(`${INTERNAL_API_BASE}/stores/default`);
  if (!res.ok) throw new Error("Failed to resolve default store");
  const store = (await res.json()) as { id?: string };
  if (!store?.id) throw new Error("Default store missing id");
  return store.id;
}

const systemPrompt = `
You are the WooAnalytics assistant. Use the provided tools to answer with real data only. Always:
- Use tools to fetch metrics; never invent numbers.
- Keep output plain text with simple bullets and line breaks. No headings, no markdown tables, no bold/italics. Light emoji only if it improves clarity (e.g., ✅/📉).
- Only include metrics that were asked for. Revenue questions: revenue (and % change vs previous if available) only; add orders/AOV only if explicitly requested. Top lists: name + revenue + units, limit to the requested count.
- Be concise and factual; no marketing language.
- If data is missing for a request, say so and suggest the closest available.
- If previous-period KPIs are available, mention direction and % change.
- Include date ranges when relevant, but do not echo filter details (storeId/category/coupon) unless the user asks.
Available metrics: KPIs (revenue, orders, aov, units, customers, netRevenue, refunds, discounts, shipping, tax, avgItemsPerOrder, newCustomers, previous period), sales timeseries, aov/cumulative/rolling, refunds/discounts, shipping/tax, new vs returning, top products/categories, segments, RFM, cohorts, recent orders.
`;

function resolveDateRange(message: string, filters: any) {
  const text = (message || "").toLowerCase();
  const now = new Date();
  let from: string | undefined = filters.from;
  let to: string | undefined = filters.to;

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const setWindow = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    from = iso(start);
    to = iso(end);
  };

  if (!from || !to) {
    if (text.includes("last 7") || text.includes("past 7") || text.includes("previous week")) {
      setWindow(7);
    } else if (text.includes("last week")) {
      setWindow(7);
    } else if (text.includes("last 30") || text.includes("past 30") || text.includes("last month")) {
      setWindow(30);
    } else {
      // default 30 days
      setWindow(30);
    }
  }

  // fallback if still missing
  if (!from || !to) {
    const end = now;
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    from = from || iso(start);
    to = to || iso(end);
  }

  return { finalFrom: from, finalTo: to };
}

// Mounted at /assistant -> POST /assistant/query
router.post("/query", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

    const { message, storeId: bodyStoreId, filters = {}, history = [] } = req.body || {};
    const mockMode = process.env.ASSISTANT_MOCK === "1" || req.body?.mock === true;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const storeId = await resolveStoreId(bodyStoreId);
    const { finalFrom, finalTo } = resolveDateRange(message, filters);
    const baseArgs = {
      storeId,
      from: finalFrom,
      to: finalTo,
      category: filters.category,
      coupon: filters.coupon
    };

    // Mock mode: skip LLM, optionally pull KPIs and return a simple summary.
    if (mockMode || !apiKey) {
      const dataUsed: any[] = [];
      let summary = "Assistant mock mode: no LLM available.";
      try {
        const kpis = await toolExecutors.get_kpis(baseArgs);
        dataUsed.push({ tool: "get_kpis", args: baseArgs, result: kpis });
        summary = `Revenue: ${kpis.revenue ?? "n/a"}, Orders: ${
          kpis.orders ?? "n/a"
        }, AOV: ${kpis.aov ?? "n/a"}.`;
      } catch (e: any) {
        summary += ` (KPI fetch failed: ${e?.message || e})`;
      }
      return res.json({ answer: summary, dataUsed });
    }

    const openai = new OpenAI({ apiKey, baseURL });
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `Use these filters unless the user overrides them explicitly: storeId=${storeId}, from=${finalFrom}, to=${finalTo}, category=${baseArgs.category ?? "none"}, coupon=${baseArgs.coupon ?? "none"}. Always reflect these dates/filters in the answer.`
      },
      ...(Array.isArray(history) ? history : []),
      {
        role: "user",
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: ASSISTANT_MODEL,
      messages,
      tools: toolSchemas.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as any
        }
      })),
      tool_choice: "auto"
    });

    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls || [];
    const dataUsed: any[] = [];
    const toolMessages: any[] = [];

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || "{}");
      const exec = toolExecutors[name];
      if (!exec) continue;
      // Force storeId from resolved value to avoid tool overrides; apply defaults
      const mergedArgs = {
        ...args,
        storeId,
        from: finalFrom,
        to: finalTo,
        category: baseArgs.category,
        coupon: baseArgs.coupon
      };
      const result = await exec(mergedArgs);
      dataUsed.push({ tool: name, args: mergedArgs, result });
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }

    let finalMessage = choice.message.content;
    if (toolMessages.length > 0) {
      const followUp = await openai.chat.completions.create({
        model: ASSISTANT_MODEL,
        messages: [
          ...messages,
          {
            role: "assistant",
            tool_calls: toolCalls,
            content: choice.message.content || ""
          },
          ...toolMessages
        ]
      });
      finalMessage = followUp.choices[0].message.content;
    }

    res.json({
      answer: finalMessage,
      dataUsed
    });
  } catch (err: any) {
    console.error("POST /assistant/query error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Assistant query failed" });
  }
});

export default router;
