"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";

export function useMetaFilters() {
  const [categories, setCategories] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingMeta(true);

        const [cats, coups] = await Promise.all([
          fetchJson<string[]>("/api/meta/categories"),
          fetchJson<string[]>("/api/meta/coupons"),
        ]);

        if (cancelled) return;

        setCategories(Array.isArray(cats) ? cats : []);
        setCoupons(Array.isArray(coups) ? coups : []);
      } catch (err) {
        if (cancelled) return;
        console.error("useMetaFilters error:", err);
        setCategories([]);
        setCoupons([]);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, coupons, loadingMeta };
}