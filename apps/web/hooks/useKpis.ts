'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { getJson, buildFilterParams } from '@/lib/api';

export interface Kpis {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
}


export function useKpis(filter: FilterState) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    

    (async () => {
      try {

        const data = await getJson<Kpis>('/kpis', buildFilterParams(filter));
        if (!cancelled) {
          setLoading(true);
          setError(null);
          setKpis(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load KPIs', err);
          setError('Failed to load KPIs');
          setKpis(null);         // leave all zeros in the UI
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(buildFilterParams(filter))]);

  return { kpis, loading, error };
}