// apps/web/hooks/useSalesSeries.ts
"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import type { SalesPoint } from "@/types/sales";
import { getJson, buildFilterParams } from "@/lib/api";
import { useStore } from "@/providers/store-provider";

export function useSalesSeries(filter: FilterState) {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until store is loaded
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setSales([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params (storeId + date range + type/category/coupon)
        const q = buildFilterParams(filter, store.id);
        const params = new URLSearchParams(q as Record<string, string>);

        const data = await getJson<{ sales: SalesPoint[] }>(
          "/sales",
          params
        );

        if (cancelled) return;
        setSales(data?.sales ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("useSalesSeries error:", err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load sales series";
        setError(message);
        setSales([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    store?.id,
    loadingStore,
    storeError,
    filter.type,
    filter.date?.from,
    filter.date?.to,
    filter.category,
    filter.coupon,
    filter,
  ]);

  return {
    sales,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
