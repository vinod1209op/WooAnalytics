import type { ReactElement } from 'react';
import { RevenueChart } from './revenue-chart';
import { OrdersChart } from './orders-chart';
import { SegmentsChart } from './segments-chart';
import { RfmHeatmap } from './rfm-chart';
import { AovChart } from './aov-chart';
import { CumulativeChart } from './cumulative-chart';
import { RollingChart } from './rolling-chart';
import { RefundsDiscountsChart } from './refunds-discounts-chart';
import { ShippingTaxChart } from './shipping-tax-chart';
import { NewVsReturningChart } from './new-vs-returning-chart';
import { TopProductsChart } from './top-products-chart';
import { CohortsChart } from './cohorts-chart';
import { TopCategoriesChart } from './top-categories-chart';
import { LeadCouponFunnelChart } from './lead-coupon-funnel-chart';
import { UtmOrdersChart } from './utm-orders-chart';
import type { SalesPoint } from '@/types/sales';
import type { SegmentPoint } from '@/types/segment';
import type { RfmHeatmapCell } from '@/types/rfmCell';
import type {
  AovPoint,
  CumulativePoint,
  RollingPoint,
  ProductPerformance,
  RefundsDiscountsPoint,
  ShippingTaxPoint,
  NewVsReturningPoint,
  RetentionCohort,
  LeadCouponPoint,
  LeadCouponSummary,
  UtmOrdersPoint,
  UtmOrdersSummary,
} from '@/types/analytics';
import type { CategorySummary } from '@/types/category';

export type ChartId =
  | 'revenue_orders'
  | 'orders'
  | 'segments'
  | 'rfm'
  | 'aov'
  | 'cumulative'
  | 'rolling'
  | 'refunds_discounts'
  | 'shipping_tax'
  | 'new_returning'
  | 'top_products'
  | 'top_categories'
  | 'retention_cohorts'
  | 'lead_coupons'
  | 'utm_orders';

export type ChartRegistryContext = {
  sales: SalesPoint[];
  salesLoading?: boolean;
  salesError?: string | null;
  segments: SegmentPoint[];
  segmentsLoading?: boolean;
  segmentsError?: string | null;
  rfm: RfmHeatmapCell[];
  rfmLoading?: boolean;
  aov: AovPoint[];
  aovLoading?: boolean;
  aovError?: string | null;
  cumulative: CumulativePoint[];
  cumulativeLoading?: boolean;
  cumulativeError?: string | null;
  rolling: RollingPoint[];
  rollingLoading?: boolean;
  rollingError?: string | null;
  refundsDiscounts: RefundsDiscountsPoint[];
  refundsDiscountsLoading?: boolean;
  refundsDiscountsError?: string | null;
  shippingTax: ShippingTaxPoint[];
  shippingTaxLoading?: boolean;
  shippingTaxError?: string | null;
  newReturning: NewVsReturningPoint[];
  newReturningLoading?: boolean;
  newReturningError?: string | null;
  topProducts: ProductPerformance[];
  topProductsLoading?: boolean;
  topProductsError?: string | null;
  topCategories: CategorySummary[];
  topCategoriesLoading?: boolean;
  topCategoriesError?: string | null;
  cohorts: RetentionCohort[];
  cohortsLoading?: boolean;
  cohortsError?: string | null;
  leadCoupons: LeadCouponPoint[];
  leadCouponsSummary: LeadCouponSummary | null;
  leadCouponsLoading?: boolean;
  leadCouponsError?: string | null;
  utmOrders: UtmOrdersPoint[];
  utmOrdersTotal: number;
  utmOrdersMovement: UtmOrdersSummary | null;
  utmOrdersLoading?: boolean;
  utmOrdersError?: string | null;
};

type ChartEntry = {
  id: ChartId;
  label: string;
  description?: string;
  render: (ctx: ChartRegistryContext) => ReactElement;
};

export const chartRegistry: ChartEntry[] = [
  {
    id: 'revenue_orders',
    label: 'Revenue & Orders',
    description: 'Trend of revenue with orders overlay',
    render: (ctx) => (
      <RevenueChart
        data={ctx.sales}
        loading={ctx.salesLoading}
        error={ctx.salesError}
        variant="plain"
      />
    ),
  },
  {
    id: 'orders',
    label: 'Orders Trend',
    description: 'Orders over time',
    render: (ctx) => (
      <OrdersChart
        data={ctx.sales}
        loading={ctx.salesLoading}
        error={ctx.salesError}
        variant="plain"
      />
    ),
  },
  {
    id: 'segments',
    label: 'Customer Segments',
    description: 'Segment counts by rule',
    render: (ctx) => (
      <SegmentsChart data={ctx.segments} loading={ctx.segmentsLoading} />
    ),
  },
  {
    id: 'rfm',
    label: 'RFM Heatmap',
    description: 'Recency-Frequency distribution',
    render: (ctx) => (
      <RfmHeatmap data={ctx.rfm} loading={!!ctx.rfmLoading} />
    ),
  },
  {
    id: 'aov',
    label: 'AOV Trend',
    description: 'Average order value with revenue/orders overlay',
    render: (ctx) => <AovChart data={ctx.aov} loading={ctx.aovLoading} error={ctx.aovError} />,
  },
  {
    id: 'cumulative',
    label: 'Cumulative Revenue & Orders',
    description: 'Running totals over time',
    render: (ctx) => <CumulativeChart data={ctx.cumulative} loading={ctx.cumulativeLoading} error={ctx.cumulativeError} />,
  },
  {
    id: 'rolling',
    label: 'Rolling 7-day Revenue/Orders',
    description: 'Smoothed trailing averages',
    render: (ctx) => <RollingChart data={ctx.rolling} loading={ctx.rollingLoading} error={ctx.rollingError} />,
  },
  {
    id: 'refunds_discounts',
    label: 'Refunds & Discounts Impact',
    description: 'Daily totals for refunds and discounts',
    render: (ctx) => <RefundsDiscountsChart data={ctx.refundsDiscounts} loading={ctx.refundsDiscountsLoading} error={ctx.refundsDiscountsError} />,
  },
  {
    id: 'shipping_tax',
    label: 'Shipping & Tax Trends',
    description: 'Daily shipping and tax totals',
    render: (ctx) => <ShippingTaxChart data={ctx.shippingTax} loading={ctx.shippingTaxLoading} error={ctx.shippingTaxError} />,
  },
  {
    id: 'new_returning',
    label: 'New vs Returning',
    description: 'New vs returning orders with repeat rate',
    render: (ctx) => <NewVsReturningChart data={ctx.newReturning} loading={ctx.newReturningLoading} error={ctx.newReturningError} />,
  },
  {
    id: 'top_products',
    label: 'Top Products by Revenue',
    description: 'Top sellers (revenue + units)',
    render: (ctx) => <TopProductsChart data={ctx.topProducts} loading={ctx.topProductsLoading} error={ctx.topProductsError} />,
  },
  {
    id: 'top_categories',
    label: 'Top Categories by Revenue',
    description: 'Top categories (revenue + units)',
    render: (ctx) => <TopCategoriesChart data={ctx.topCategories} loading={ctx.topCategoriesLoading} error={ctx.topCategoriesError} />,
  },
  {
    id: 'retention_cohorts',
    label: 'Retention Cohorts',
    description: 'Monthly cohorts and retention curves',
    render: (ctx) => <CohortsChart cohorts={ctx.cohorts} loading={ctx.cohortsLoading} error={ctx.cohortsError} />,
  },
  {
    id: 'lead_coupons',
    label: 'Lead Coupon Funnel',
    description: 'Lead coupons created → redeemed → orders using',
    render: (ctx) => (
      <LeadCouponFunnelChart
        summary={ctx.leadCouponsSummary}
        points={ctx.leadCoupons}
        loading={ctx.leadCouponsLoading}
        error={ctx.leadCouponsError}
      />
    ),
  },
  {
    id: 'utm_orders',
    label: 'UTM Source/Medium Orders',
    description: 'Orders and unique customers by UTM source/medium',
    render: (ctx) => (
      <UtmOrdersChart
        totalOrders={ctx.utmOrdersTotal}
        movement={ctx.utmOrdersMovement}
        points={ctx.utmOrders}
        loading={ctx.utmOrdersLoading}
        error={ctx.utmOrdersError}
      />
    ),
  },
];

export const chartOptions: { label: string; value: ChartId; description?: string }[] = [
  { label: 'Revenue & Orders', value: 'revenue_orders', description: 'Trend of revenue with orders overlay' },
  { label: 'Orders Trend', value: 'orders', description: 'Orders over time' },
  { label: 'Customer Segments', value: 'segments', description: 'Segment counts by rule' },
  { label: 'RFM Heatmap', value: 'rfm', description: 'Recency-Frequency distribution' },
  { label: 'AOV Trend', value: 'aov', description: 'Average order value over time' },
  { label: 'Cumulative Revenue & Orders', value: 'cumulative', description: 'Running totals across the period' },
  { label: 'Rolling 7-day Revenue/Orders', value: 'rolling', description: 'Smoothed trailing averages' },
  { label: 'Refunds & Discounts Impact', value: 'refunds_discounts', description: 'Refunds and discounts by day' },
  { label: 'Shipping & Tax Trends', value: 'shipping_tax', description: 'Shipping and tax totals by day' },
  { label: 'New vs Returning', value: 'new_returning', description: 'New vs returning orders and repeat rate' },
  { label: 'Top Products by Revenue', value: 'top_products', description: 'Top sellers (revenue + units)' },
  { label: 'Top Categories by Revenue', value: 'top_categories', description: 'Top categories (revenue + units)' },
  { label: 'Retention Cohorts', value: 'retention_cohorts', description: 'Cohort retention heatmap' },
  { label: 'Lead Coupon Funnel', value: 'lead_coupons', description: 'Lead coupons and usage rate' },
  { label: 'UTM Source/Medium Orders', value: 'utm_orders', description: 'Orders and customers by UTM source/medium' },
];

export function getChartById(id: ChartId) {
  return chartRegistry.find((c) => c.id === id) ?? chartRegistry[0];
}
