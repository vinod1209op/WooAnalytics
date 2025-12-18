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
  },
  {
    name: "get_last_order_for_customer",
    description: "Fetch last order for a customer by email or customerId",
    parameters: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        email: { type: "string" },
        customerId: { type: "string" }
      },
      required: ["storeId"]
    }
  },
  {
    name: "get_inactive_customers",
    description: "List customers whose last order is older than N days (default 30)",
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
