"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { fetchJson } from "@/lib/api";

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export function useSalesSeries(filter: FilterState) {
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchJson<SalesPoint[]>("/api/sales", filter);
        if (cancelled) return;
        setSales(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        console.error("useSalesSeries error:", err);
        setSales([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };

  }, [JSON.stringify(filter)]);

  return { sales, loading };
}