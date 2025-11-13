'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';

export interface RfmBucket {
  bucket: string;
  count: number;
}

export function useRfm(filter: FilterState) {
  const [rfm, setRfm] = useState<RfmBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let factor = 1;

      if (filter.type === 'category' && filter.category) factor = 0.7;
      if (filter.type === 'coupon' && filter.coupon) factor = 0.5;

      setRfm([
        { bucket: 'R5-F5', count: Math.round(60 * factor) },
        { bucket: 'R4-F4', count: Math.round(40 * factor) },
        { bucket: 'R3-F2', count: Math.round(25 * factor) },
        { bucket: 'R2-F1', count: Math.round(10 * factor) },
      ]);

      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [JSON.stringify(filter)]);

  return { rfm, loading };
}