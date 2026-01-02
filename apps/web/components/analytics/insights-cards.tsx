'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { buildFilterParams, getJson } from '@/lib/api';

type PeakResponse = { peakRevenueDay: { date: string; revenue: number; orders: number; aov: number } | null };
type AnomaliesResponse = { anomalies: { date: string; revenue: number; orders: number; revenueZ: number; ordersZ: number }[] };
type RepeatResponse = { last30: { rate: number }; last60: { rate: number }; last90: { rate: number }; last120: { rate: number } };
type HealthResponse = {
  refundRatePct: number;
  discountRatePct: number;
  grossRevenue: number;
  netRevenue: number;
  grossMarginPct: number;
  netMarginPct: number;
};

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-[#e5dcff] backdrop-blur dark:bg-purple-950/40 dark:ring-purple-900/40">
      <div className="text-xs font-medium text-[#6f4bb3] dark:text-purple-200/80">{title}</div>
      <div className="mt-1 text-lg font-semibold text-[#4a2f8f] dark:text-purple-50">{value}</div>
      {sub && <div className="text-xs text-[#7b5cb8] dark:text-purple-200/70">{sub}</div>}
    </div>
  );
}

export function InsightsCards({ storeId, filter }: { storeId: string; filter: FilterState }) {
  const [loading, setLoading] = useState(false);
  const [peak, setPeak] = useState<PeakResponse['peakRevenueDay'] | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [repeatRates, setRepeatRates] = useState<{ r30: number; r60: number; r90: number; r120: number }>({ r30: 0, r60: 0, r90: 0, r120: 0 });
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = buildFilterParams(filter, storeId);
        // peaks
        const [peakRes, anomaliesRes, repeatRes, healthRes] = await Promise.all([
          getJson<PeakResponse>('/analytics/peaks', new URLSearchParams(params)),
          getJson<AnomaliesResponse>('/analytics/anomalies', new URLSearchParams({ storeId })),
          getJson<RepeatResponse>('/analytics/repeat-purchase', new URLSearchParams({ storeId })),
          getJson<HealthResponse>('/analytics/health-ratios', new URLSearchParams(params)),
        ]);
        if (cancelled) return;
        setPeak(peakRes.peakRevenueDay);
        setAnomalyCount(anomaliesRes.anomalies?.length ?? 0);
        setRepeatRates({
          r30: repeatRes.last30?.rate ?? 0,
          r60: repeatRes.last60?.rate ?? 0,
          r90: repeatRes.last90?.rate ?? 0,
          r120: repeatRes.last120?.rate ?? 0,
        });
        setHealth(healthRes);
      } catch {
        if (!cancelled) {
          setPeak(null);
          setAnomalyCount(0);
          setRepeatRates({ r30: 0, r60: 0, r90: 0, r120: 0 });
          setHealth(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filter, storeId]);

  const cards = [
    <StatCard
      key="peak"
      title="Peak revenue day"
      value={
        peak
          ? `${peak.date} • $${peak.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : loading
          ? 'Loading...'
          : 'No data'
      }
      sub={peak ? `${peak.orders} orders • AOV $${peak.aov.toFixed(2)}` : undefined}
    />,
    <StatCard
      key="anomalies"
      title="Recent anomalies (30d)"
      value={loading ? 'Loading...' : `${anomalyCount} flagged`}
      sub={anomalyCount > 0 ? 'Revenue/orders outside normal range' : 'No spikes detected'}
    />,
    <StatCard
      key="repeat"
      title="Repeat purchase rate"
      value={
        loading
          ? 'Loading...'
          : `30d: ${repeatRates.r30.toFixed(1)}% • 60d: ${repeatRates.r60.toFixed(1)}%`
      }
      sub={
        loading
          ? ''
          : `90d: ${repeatRates.r90.toFixed(1)}% • 120d: ${repeatRates.r120.toFixed(1)}%`
      }
    />,
    <StatCard
      key="health"
      title="Health ratios"
      value={
        health
          ? `Refund ${health.refundRatePct?.toFixed(1)}% • Discount ${health.discountRatePct?.toFixed(1)}%`
          : loading
          ? 'Loading...'
          : 'No data'
      }
      sub={
        health
          ? `Net $${Math.round(health.netRevenue ?? 0).toLocaleString()} / Gross $${Math.round(health.grossRevenue ?? 0).toLocaleString()}`
          : undefined
      }
    />,
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards}
    </div>
  );
}
