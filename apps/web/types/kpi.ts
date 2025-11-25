export interface KpiPeriod {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
  netRevenue: number;
  refunds: number;
  discounts: number;
  shipping: number;
  tax: number;
  avgItemsPerOrder: number;
  newCustomers: number;
}

export interface KpiSummary extends KpiPeriod {
  previous?: KpiPeriod;
}
