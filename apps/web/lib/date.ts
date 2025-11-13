// Return YYYY-MM-DD from Date or date-string
export function ymd(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Start of day (local)
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// End of day (local)
export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

// Add (or subtract) days
export function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export interface DateRange {
  from: Date;
  to: Date;
}

// Convenience: last N days range ending today
export function lastNDaysRange(n: number): DateRange {
  const to = startOfDay(new Date());
  const from = startOfDay(addDays(to, -n + 1));
  return { from, to };
}

// Parse a YYYY-MM-DD string into a Date or null
export function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(+d) ? null : d;
}