"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import type { CategorySummary } from "@/types/category";
import { buildFilterParams } from "@/lib/api";
import { useStoreFetch } from "./useStoreFetch";

export function useTopCategoriesPerformance(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<CategorySummary[]>({
    path: "/categories/top",
    searchParams: params,
  });

  return {
    categories: data ?? [],
    loading,
    error,
  };
}
