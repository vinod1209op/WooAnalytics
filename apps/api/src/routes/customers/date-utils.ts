import { round2 } from "../analytics/utils";

export function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(+d)) return null;
  return d;
}

export function daysSince(date: Date, nowMs: number) {
  return round2((nowMs - date.getTime()) / (1000 * 60 * 60 * 24));
}
