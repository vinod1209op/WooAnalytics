export function normalizeDate(value?: string) {
  if (!value) return undefined;
  const hasTz = /Z$|[+-]\d\d:\d\d$/.test(value);
  const iso = hasTz ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function safeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function trackRemote(
  map: Map<string, { revenue: number; orders: number }>,
  order: any
) {
  const created =
    order.date_created_gmt ?? order.date_created ?? new Date().toISOString();
  const day = String(created).slice(0, 10);
  const bucket = map.get(day) ?? { revenue: 0, orders: 0 };
  bucket.revenue += Number(order.total ?? 0);
  bucket.orders += 1;
  map.set(day, bucket);
}

export function renderProgress(label: string, count: number) {
  if (process.stdout?.write) {
    process.stdout.write(`\r${label} processed: ${count.toString().padEnd(8, ' ')}`);
  }
}

export function finishProgress() {
  if (process.stdout?.write) {
    process.stdout.write('\n');
  }
}
