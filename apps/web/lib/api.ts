// apps/web/lib/api.ts
import type { FilterState } from "@/components/filters/filter-bar";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

// turn FilterState into URLSearchParams (start, end, type, category/coupon)
export function buildFilterQuery(filter?: FilterState): string {
  const params = new URLSearchParams();

  if (filter) {
    const { type, date, category, coupon } = filter;

    if (date?.from) params.set("start", date.from.toISOString());
    if (date?.to) params.set("end", date.to.toISOString());

    params.set("type", type);

    if (type === "category" && category) {
      params.set("category", category);
    }
    if (type === "coupon" && coupon) {
      params.set("coupon", coupon);
    }
  }

  return params.toString();
}

export async function fetchJson<T>(
  path: string,
  filter?: FilterState
): Promise<T> {
  const qs = filter ? buildFilterQuery(filter) : "";
  const url = qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;

  const res = await fetch(url, {
    // so it works both in dev & when deployed
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}