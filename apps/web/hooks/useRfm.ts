"use client";

import { useEffect, useState, useMemo } from "react";
import { getJson } from "@/lib/api";
import { useStore } from "@/providers/store-provider";
import type { FilterState } from "@/components/filters/filter-bar";
import { RfmRow } from "@/types/rfm";
import { RfmHeatmapCell } from "@/types/rfmCell";

type UseRfmHeatmapResult = {
  cells: RfmHeatmapCell[];
  loading: boolean;
  error: string | null;
};

/**
 * Scoring helpers – very simple fixed rules for now.
 * You can tweak these later if your supervisor wants different cutoffs.
 */
function getRecencyScore(days: number): number {
  if (days <= 7) return 5;      // bought in last week
  if (days <= 30) return 4;     // last month
  if (days <= 90) return 3;     // last 3 months
  if (days <= 180) return 2;    // last 6 months
  return 1;                     // older
}

function getFrequencyScore(freq: number): number {
  if (freq >= 10) return 5;
  if (freq >= 5) return 4;
  if (freq >= 3) return 3;
  if (freq >= 2) return 2;
  return 1;
}

export function useRfmHeatmap(filter: FilterState): UseRfmHeatmapResult {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [rows, setRows] = useState<RfmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) Load raw RFM rows from backend
  useEffect(() => {
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || "No store configured");
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("storeId", store.id);

        // ✅ ONLY DATE FILTER – ignore category/coupon
        const from = filter.date?.from;
        const to = filter.date?.to;

        if (from) params.set("from", from.toISOString().slice(0, 10));
        if (to) params.set("to", to.toISOString().slice(0, 10));

        const data = await getJson<RfmRow[]>("/rfm", params);

        if (cancelled) return;
        setRows(data ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("useRfmHeatmap error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load RFM data";
        setError(msg);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError, filter.date?.from, filter.date?.to]);

  // 2) Convert rows → 5×5 heatmap buckets
  const cells = useMemo<RfmHeatmapCell[]>(() => {
    if (!rows.length) return [];

    const map = new Map<string, RfmHeatmapCell>();

    for (const row of rows) {
      const rScore = getRecencyScore(row.recency_days);
      const fScore = getFrequencyScore(row.frequency);
      const key = `${rScore}-${fScore}`;

      let cell = map.get(key);
      if (!cell) {
        cell = {
          rScore,
          fScore,
          count: 0,
          totalMonetary: 0,
          avgMonetary: 0,
        };
        map.set(key, cell);
      }

      cell.count += 1;
      cell.totalMonetary += row.monetary;
    }

    // finalize avg monetary
    for (const cell of map.values()) {
      cell.avgMonetary =
        cell.count > 0 ? cell.totalMonetary / cell.count : 0;
    }

    // Fill full 5×5 grid so chart is stable even if some combos are empty
    const result: RfmHeatmapCell[] = [];
    for (let r = 5; r >= 1; r--) {      // show 5 at top → 1 at bottom
      for (let f = 1; f <= 5; f++) {
        const key = `${r}-${f}`;
        const base = map.get(key);
        result.push(
          base ?? {
            rScore: r,
            fScore: f,
            count: 0,
            totalMonetary: 0,
            avgMonetary: 0,
          }
        );
      }
    }

    return result;
  }, [rows]);

  return {
    cells,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
