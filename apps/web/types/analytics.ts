export type AovPoint = {
  date: string;
  aov: number;
  revenue: number;
  orders: number;
};

export type CumulativePoint = {
  date: string;
  revenue: number;
  orders: number;
  revenueCumulative: number;
  ordersCumulative: number;
};

export type RollingPoint = {
  date: string;
  revenue: number;
  orders: number;
  revenue7d: number;
  orders7d: number;
};

export type ProductPerformance = {
  id: number;
  name: string | null;
  sku: string | null;
  price: number | null;
  revenue: number;
  units: number;
};

export type RefundsDiscountsPoint = {
  date: string;
  refunds: number;
  discounts: number;
  totalImpact: number;
};

export type ShippingTaxPoint = {
  date: string;
  shipping: number;
  tax: number;
};

export type NewVsReturningPoint = {
  date: string;
  newOrders: number;
  returningOrders: number;
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number; // percentage 0..100
};

export type RetentionCohortPeriod = {
  periodMonth: number;
  activeCustomers: number;
  retentionRate: number;
};

export type RetentionCohort = {
  cohortMonth: string;
  customersInCohort: number;
  periods: RetentionCohortPeriod[];
};
