"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { fetchJson } from "@/lib/api";

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchJson<Kpis>("/api/kpis", filter);
        if (cancelled) return;
        setKpis(data);
      } catch (err) {
        if (cancelled) return;
        console.error("useKpis error:", err);
        setKpis(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };

    // depend on filter snapshot
  }, [JSON.stringify(filter)]);

  return { kpis, loading };
}