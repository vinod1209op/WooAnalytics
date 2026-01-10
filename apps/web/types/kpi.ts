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
  sampleBuyers: number;
  sampleRepeatBuyers: number;
}

export interface KpiSummary extends KpiPeriod {
  leadCouponRedemptionRate?: number | null;
  leadCouponRedemptionRatePrev?: number | null;
  sampleRepeatRate?: number | null;
  sampleRepeatRatePrev?: number | null;
  previous?: KpiPeriod;
}
