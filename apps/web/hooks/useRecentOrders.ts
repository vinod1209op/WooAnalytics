"use client";

import { useEffect, useState } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { getJson } from "@/lib/api";
import { useStore } from "@/providers/store-provider";
import type { RecentOrder } from "@/types/order";

export function useRecentOrders(filter: FilterState, limit = 10) {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setOrders([]);
      setLoading(false);
      return;
    }

    const storeId = store.id;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("storeId", storeId);
        params.set("limit", String(limit));

        const from = filter.date?.from;
        const to = filter.date?.to;
        if (from) params.set("from", from.toISOString().slice(0, 10));
        if (to) params.set("to", to.toISOString().slice(0, 10));

        const data = await getJson<RecentOrder[]>("/orders/recent", params);
        if (!cancelled) setOrders(data ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("useRecentOrders error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load orders";
        setError(msg);
        setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError, filter.date?.from, filter.date?.to, filter, limit]);

  return {
    orders,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
