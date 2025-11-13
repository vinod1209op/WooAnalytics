'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { ymd } from '@/lib/date';

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export function useSalesSeries(filter: FilterState) {
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const defaultTo = new Date();
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const from = filter.date?.from ?? defaultFrom;
      const to = filter.date?.to ?? defaultTo;

      const points: SalesPoint[] = [];
      const cursor = new Date(from);

      while (cursor <= to) {
        const dayIndex = points.length;
        const base = 400 + (dayIndex % 7 === 0 ? 600 : 0);

        let multiplier = 1;
        if (filter.type === 'category' && filter.category) {
          multiplier = 0.7;
        } else if (filter.type === 'coupon' && filter.coupon) {
          multiplier = 0.5;
        }

        const revenue = base * multiplier;
        const orders = Math.max(1, Math.round(revenue / 200));

        points.push({
          date: ymd(cursor),
          revenue: Number(revenue.toFixed(2)),
          orders,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      setSales(points);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [JSON.stringify(filter)]);

  return { sales, loading };
}