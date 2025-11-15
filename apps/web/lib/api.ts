// apps/web/lib/api.ts
import type { FilterState } from '@/components/filters/filter-bar';

export function buildFilterParams(filter: FilterState): Record<string, string> {
  const params: Record<string, string> = {};

  if (filter.type === 'date' && filter.date?.from && filter.date?.to) {
    params.from = filter.date.from.toISOString().slice(0, 10);
    params.to = filter.date.to.toISOString().slice(0, 10);
  }

  if (filter.type === 'category' && filter.category) {
    params.category = filter.category;
  }

  if (filter.type === 'coupon' && filter.coupon) {
    params.coupon = filter.coupon;
  }

  return params;
}

export async function getJson<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  const url = new URL(path, base);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}