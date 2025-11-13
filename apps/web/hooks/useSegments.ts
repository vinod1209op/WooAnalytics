'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';

export interface SegmentPoint {
  segment: string;  
  customers: number;  
  revenue: number;   
  avgValue: number; 
}


export function useSegments(filter: FilterState) {
  const [segments, setSegments] = useState<SegmentPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const timeout = setTimeout(() => {
      let factor = 1;
      if (filter.type === 'category' && filter.category) factor = 0.7;
      if (filter.type === 'coupon' && filter.coupon) factor = 0.5;

      setSegments([
        { segment: 'Champions', customers: Math.round(65 * factor), revenue: 9200, avgValue: 511  },
        { segment: 'Loyal', customers: Math.round(40 * factor),   revenue: 14100, avgValue: 403 },
        { segment: 'At Risk', customers: Math.round(25 * factor), revenue: 7800,  avgValue: 867  },
        { segment: 'Hibernating', customers: Math.round(15 * factor), revenue: 2600,  avgValue: 87 },
      ]);

      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [JSON.stringify(filter)]);

  return { segments, loading };
}
