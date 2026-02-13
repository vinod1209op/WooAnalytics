'use client';

import { useState } from 'react';
import type { ChartId, ChartRegistryContext } from '@/components/analytics/chart-registry';
import type { FilterState } from '@/components/filters/filter-bar';
import { useSalesSeries } from './useSalesSeries';
import { useSegments } from './useSegments';
import { useRfmHeatmap } from './useRfm';
import { useAovSeries } from './useAov';
import { useCumulativeSeries } from './useCumulative';
import { useRollingSeries } from './useRolling';
import { useRefundsDiscounts } from './useRefundsDiscounts';
import { useShippingTax } from './useShippingTax';
import { useNewVsReturning } from './useNewVsReturning';
import { useTopProductsPerformance } from './useTopProductsPerformance';
import { useRetentionCohorts } from './useRetentionCohorts';
import { useTopCategoriesPerformance } from './useTopCategoriesPerformance';
import { useLeadCoupons } from './useLeadCoupons';
import { useUtmOrders } from './useUtmOrders';
import { useCartRecovery } from './useCartRecovery';

type UseAnalyticsChartsResult = {
  chartSlots: ChartId[];
  setChartSlots: (updater: (prev: ChartId[]) => ChartId[]) => void;
  chartContext: ChartRegistryContext;
};

export function useAnalyticsCharts(filter: FilterState): UseAnalyticsChartsResult {
  const { sales, loading: salesLoading, error: salesError } = useSalesSeries(filter);
  const { segments, loading: segmentsLoading, error: segmentsError } = useSegments(filter);
  const { cells: rfmCells, loading: rfmLoading } = useRfmHeatmap(filter);
  const { points: aov, loading: aovLoading, error: aovError } = useAovSeries(filter);
  const { points: cumulative, loading: cumulativeLoading, error: cumulativeError } = useCumulativeSeries(filter);
  const { points: rolling, loading: rollingLoading, error: rollingError } = useRollingSeries(filter);
  const { points: refundsDiscounts, loading: refundsDiscountsLoading, error: refundsDiscountsError } = useRefundsDiscounts(filter);
  const { points: shippingTax, loading: shippingTaxLoading, error: shippingTaxError } = useShippingTax(filter);
  const { points: newReturning, loading: newReturningLoading, error: newReturningError } = useNewVsReturning(filter);
  const { products: topProducts, loading: topProductsLoading, error: topProductsError } = useTopProductsPerformance(filter);
  const { categories: topCategories, loading: topCategoriesLoading, error: topCategoriesError } = useTopCategoriesPerformance(filter);
  const { cohorts, loading: cohortsLoading, error: cohortsError } = useRetentionCohorts();
  const {
    summary: leadCouponsSummary,
    points: leadCoupons,
    loading: leadCouponsLoading,
    error: leadCouponsError,
  } = useLeadCoupons(filter);
  const {
    totalOrders: utmOrdersTotal,
    movement: utmOrdersMovement,
    points: utmOrders,
    loading: utmOrdersLoading,
    error: utmOrdersError,
  } = useUtmOrders(filter);
  const {
    summary: cartRecoverySummary,
    points: cartRecovery,
    speedBuckets: cartRecoverySpeedBuckets,
    loading: cartRecoveryLoading,
    error: cartRecoveryError,
  } = useCartRecovery(filter);
  const [chartSlots, setChartSlotsState] = useState<ChartId[]>([
    'revenue_orders', // slot 1
    'cart_recovery', // slot 2
    'top_categories', // slot 3
    'segments', // slot 4
  ]);

  const setChartSlots = (updater: (prev: ChartId[]) => ChartId[]) =>
    setChartSlotsState((prev) => updater(prev));

  const chartContext: ChartRegistryContext = {
    sales,
    salesLoading,
    salesError,
    segments,
    segmentsLoading,
    segmentsError,
    rfm: rfmCells,
    rfmLoading,
    aov,
    aovLoading,
    aovError,
    cumulative,
    cumulativeLoading,
    cumulativeError,
    rolling,
    rollingLoading,
    rollingError,
    refundsDiscounts,
    refundsDiscountsLoading,
    refundsDiscountsError,
    shippingTax,
    shippingTaxLoading,
    shippingTaxError,
    newReturning,
    newReturningLoading,
    newReturningError,
    topProducts,
    topProductsLoading,
    topProductsError,
    topCategories,
    topCategoriesLoading,
    topCategoriesError,
    cohorts,
    cohortsLoading,
    cohortsError,
    leadCoupons,
    leadCouponsSummary,
    leadCouponsLoading,
    leadCouponsError,
    utmOrders,
    utmOrdersTotal,
    utmOrdersMovement,
    utmOrdersLoading,
    utmOrdersError,
    cartRecovery,
    cartRecoverySummary,
    cartRecoverySpeedBuckets,
    cartRecoveryLoading,
    cartRecoveryError,
  };

  return { chartSlots, setChartSlots, chartContext };
}
