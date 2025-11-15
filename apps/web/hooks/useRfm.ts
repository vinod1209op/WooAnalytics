"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { fetchJson } from "@/lib/api";

export interface RfmCell {
  recency: number;
  frequency: number;
  count: number;
  score: number;
}

export interface RfmBucket {
  bucket: string;
  count: number;
}

export function useRfm(filter: FilterState) {
  const [rfm, setRfm] = useState<RfmBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const cells = await fetchJson<RfmCell[]>("/api/rfm/heatmap", filter);
        if (cancelled) return;

        // turn 5x5 cells into a smaller list like "R5-F4"
        const buckets: RfmBucket[] = cells
          .map((c) => ({
            bucket: `R${c.recency}-F${c.frequency}`,
            count: c.count,
          }))
          .filter((b) => b.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setRfm(buckets);
      } catch (err) {
        if (cancelled) return;
        console.error("useRfm error:", err);
        setRfm([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filter)]);

  return { rfm, loading };
}