const ANALYTICS_TZ = process.env.ANALYTICS_TIMEZONE || "America/Los_Angeles";

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
  const match = tzName.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + (hours >= 0 ? mins : -mins);
}

export function ymd(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function monthDiff(from: Date, to: Date) {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  return years * 12 + months;
}

export function zonedDateFromYmd(day: string, endOfDay = false) {
  const [y, m, d] = day.split("-").map(Number);
  const baseUtc = Date.UTC(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
  const offsetMinutes = getOffsetMinutes(new Date(baseUtc), ANALYTICS_TZ);
  return new Date(baseUtc - offsetMinutes * 60 * 1000);
}
