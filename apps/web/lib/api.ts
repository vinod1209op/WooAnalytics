// apps/web/lib/api.ts
import type { FilterState } from '@/components/filters/filter-bar';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3001';

export function buildFilterParams(filter: FilterState, storeId: string): Record<string, string> {
  const params: Record<string, string> = {};

  params.storeId = storeId;
  params.type = filter.type;

  if (filter.date?.from && filter.date?.to) {
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

function buildUrl(
  path: string,
  params?: URLSearchParams | Record<string, string | number | undefined>
) {
  const base = API_BASE.startsWith('http')
    ? API_BASE
    : `https://${API_BASE}`;

  const url = new URL(path, base);

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => url.searchParams.set(key, value));
  } else if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(String(key), String(value));
      }
    });
  }

  return url;
}


/**
 * Generic helper to call the API and return JSON.
 */
export async function getJson<T>(
  path: string,
  params?: URLSearchParams
): Promise<T> {
  const url = buildUrl(path, params);

  if (params) {
    url.search = params.toString();
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch (e) {
      // ignore
    }
    throw new Error(
      `API ${res.status} ${res.statusText}${detail ? ` – ${detail}` : ''}`
    );
  }

  return res.json() as Promise<T>;
}
