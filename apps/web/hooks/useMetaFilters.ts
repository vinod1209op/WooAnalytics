"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";
import { useStore } from "@/providers/store-provider";

export function useMetaFilters() {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [categories, setCategories] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // wait until store is loaded
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setCategories([]);
      setCoupons([]);
      setLoadingMeta(false);
      return;
    }
    const storeId = store.id;

    let cancelled = false;

    (async () => {
      try {
        setLoadingMeta(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("storeId", storeId);

        const [cats, coups] = await Promise.all([
          getJson<string[]>("/meta/categories", params),
          getJson<string[]>("/meta/coupons", params),
        ]);

        if (cancelled) return;

        setCategories(cats ?? []);
        setCoupons(coups ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("useMetaFilters error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load meta filters";
        setError(msg);
        setCategories([]);
        setCoupons([]);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError]);

  return { categories, coupons, loadingMeta, error: error ?? storeError ?? null };
}
