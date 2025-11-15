"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { fetchJson } from "@/lib/api";

export interface SegmentRow {
  segment: string;
  customers: number;
  revenue: number;
  avgValue: number;
}

export function useSegments(filter: FilterState) {
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchJson<SegmentRow[]>(
          "/api/segments/summary",
          filter
        );
        if (cancelled) return;
        setSegments(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        console.error("useSegments error:", err);
        setSegments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };

  }, [JSON.stringify(filter)]);

  return { segments, loading };
}