export interface KpiSummary {
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
  previous?: {
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
  };
}
