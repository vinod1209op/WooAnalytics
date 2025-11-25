// apps/web/hooks/useStoreFetch.ts
"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/providers/store-provider";
import { getJson } from "@/lib/api";

type FetcherParams = {
  path: string;
  searchParams?: URLSearchParams;
  enabled?: boolean;
};

export function useStoreFetch<T>({ path, searchParams, enabled = true }: FetcherParams) {
  const { store, loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(searchParams ?? {});
    params.set("storeId", store.id);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getJson<T>(path, params);
        if (cancelled) return;
        setData(response ?? null);
      } catch (err) {
        if (cancelled) return;
        console.error(`useStoreFetch error (${path}):`, err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Request failed";
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, loadingStore, path, searchParams?.toString(), store?.id, storeError]);

  return {
    data,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
