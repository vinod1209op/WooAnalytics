'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { API_BASE, STORE_ID, getJson, buildFilterParams } from '@/lib/api';
import { ymd } from '@/lib/date';
import { useStore } from '@/hooks/store-context';

export interface Kpis {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
}

const EMPTY: Kpis = {
  revenue: 0,
  orders: 0,
  aov: 0,
  units: 0,
  customers: 0
}

export function useKpis(filter: FilterState) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {

    if (!STORE_ID) {
      console.warn('Missing STORE_ID - Kpis will remain zero');
      setKpis(EMPTY);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const params = new URLSearchParams({
          storeId: STORE_ID,
          type: filter.type,
          from: ymd(filter.date.from),
          to: ymd(filter.date.to),
        });

        if (filter.type === 'category' && filter.category) {
          params.set('category', filter.category);
        }
        if (filter.type === 'coupon' && filter.coupon) {
          params.set('coupon', filter.coupon);
        }

        const res = await fetch(`${API_BASE} /kpis?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error ('KPIs API error:', res.status, await res.text());
          setKpis(EMPTY);
          return;
        }

        const json = await res.json();
        setKpis({
          revenue: Number(json.revenue) || 0,
          orders: Number(json.orders) || 0,
          aov: Number(json.aov) || 0,
          units: Number(json.units) || 0,
          customers: Number(json.customers) || 0,
        });
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
          console.error('KPIs fetch failed:', err);
        }
        setKpis(EMPTY);
      } finally {
        setLoading(false);
      }
    }

    run();

    return () => controller.abort();
  }, [filter]);

  return { kpis, loading };
}

