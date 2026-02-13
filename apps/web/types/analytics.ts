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

export type LeadCouponPoint = {
  date: string;
  totalOrders: number;
  leadOrders: number;
  redemptionRate: number;
};

export type LeadCouponSummary = {
  generated: number;
  redeemed: number;
  redeemedUses: number;
  ordersUsing: number;
  redemptionRate: number | null;
};

export type UtmOrdersPoint = {
  source: string;
  medium: string;
  orders: number;
  customers: number;
  share: number;
};

export type UtmOrdersSummary = {
  orders: number;
  customers: number;
  share: number;
};

export type CartRecoveryPoint = {
  date: string;
  abandonedOrders: number;
  recoveredOrders: number;
  abandonedCustomers: number;
  recoveredCustomers: number;
  orderRecoveryRate: number;
  customerRecoveryRate: number;
};

export type CartRecoverySummary = {
  abandonedOrders: number;
  recoveredOrders: number;
  orderRecoveryRate: number;
  abandonedCustomers: number;
  recoveredCustomers: number;
  unrecoveredCustomers: number;
  customerRecoveryRate: number;
  averageRecoveryHours: number | null;
  medianRecoveryHours: number | null;
  recoveredWithin24h: number;
  recoveryWindowDays: number;
  statuses: {
    abandoned: string[];
    success: string[];
  };
};

export type CartRecoverySpeedBucket = {
  id: string;
  label: string;
  count: number;
  shareRecovered: number;
  shareAbandoned: number;
};
