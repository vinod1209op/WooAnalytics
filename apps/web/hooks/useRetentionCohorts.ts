// apps/web/hooks/useRetentionCohorts.ts
"use client";

import type { RetentionCohort } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useRetentionCohorts() {
  const { data, loading, error } = useStoreFetch<{ cohorts: RetentionCohort[] }>({
    path: "/analytics/retention/cohorts",
  });

  return {
    cohorts: data?.cohorts ?? [],
    loading,
    error,
  };
}
