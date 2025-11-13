'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';

export interface Kpis {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
}

const BASE: Kpis = {
  revenue: 14724.86,
  orders: 73,
  aov: 201.71,
  units: 296,
  customers: 65,
};

export function useKpis(filter: FilterState) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const defaultTo = new Date();
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const from = filter.date?.from ?? defaultFrom;
      const to = filter.date?.to ?? defaultTo;

      let scale = 1;

      if (filter.type === 'date') {
        const ms = to.getTime() - from.getTime();
        const days = Math.max(1, Math.round(ms / 86400000) + 1);
        scale = days / 30;
      } else if (filter.type === 'category' && filter.category) {
        scale = 0.6;
      } else if (filter.type === 'coupon' && filter.coupon) {
        scale = 0.5;
      }

      setKpis({
        revenue: +(BASE.revenue * scale).toFixed(2),
        orders: Math.round(BASE.orders * scale),
        aov: BASE.aov, 
        units: Math.round(BASE.units * scale),
        customers: Math.round(BASE.customers * scale),
      });

      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [JSON.stringify(filter)]);

  return { kpis, loading };
}