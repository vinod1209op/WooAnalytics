"use client";

import { useMemo } from "react";
import type { FilterState } from "@/components/filters/filter-bar";
import { RfmRow } from "@/types/rfm";
import { RfmHeatmapCell } from "@/types/rfmCell";
import { useStoreFetch } from "./useStoreFetch";

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
  const params = new URLSearchParams();
  const from = filter.date?.from;
  const to = filter.date?.to;
  if (from) params.set("from", from.toISOString().slice(0, 10));
  if (to) params.set("to", to.toISOString().slice(0, 10));

  const { data, loading, error } = useStoreFetch<RfmRow[]>({
    path: "/rfm",
    searchParams: params,
  });

  // 2) Convert rows → 5×5 heatmap buckets
  const cells = useMemo<RfmHeatmapCell[]>(() => {
    const rows = data ?? [];
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
  }, [data]);

  return {
    cells,
    loading,
    error,
  };
}
