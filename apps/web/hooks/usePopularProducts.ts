// hooks/usePopularProducts.ts
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import type { FilterState } from "@/components/filters/filter-bar";
import { getJson } from "@/lib/api";
import { useStore } from "@/providers/store-provider";

/**
 * Popular products hook.
 * - Only the DATE RANGE controls it.
 * - Category / coupon filters are ignored in dependencies,
 *   extra params from buildFilterParams are harmless.
 */
export function usePopularProducts(filter: FilterState) {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // wait until store is loaded
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setProducts([]);
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

        const from = filter.date?.from;
        const to = filter.date?.to;

        if (from) params.set("from", from.toISOString().slice(0, 10));
        if (to) params.set("to", to.toISOString().slice(0, 10));

        const data = await getJson<Product[]>("/products/popular", params);

        if (cancelled) return;
        setProducts(data ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("usePopularProducts error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load popular products";
        setError(msg);
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError, filter.date?.from, filter.date?.to, filter]);

  return {
    products,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
