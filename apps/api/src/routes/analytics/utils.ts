import { Request } from "express";

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

export function ymd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function zonedDateFromYmd(day: string, endOfDay = false) {
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

export function parseDateRange(from?: string, to?: string) {
  let fromDate: Date;
  let toDate: Date;

  if (from && to) {
    fromDate = zonedDateFromYmd(from, false);
    toDate = zonedDateFromYmd(to, true);
  } else {
    const today = ymd(new Date());
    const toStr = today;
    const fromObj = new Date();
    fromObj.setDate(fromObj.getDate() - 29);
    const fromStr = ymd(fromObj);
    fromDate = zonedDateFromYmd(fromStr, false);
    toDate = zonedDateFromYmd(toStr, true);
  }

  if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
    throw new Error("Invalid from/to date");
  }

  return { fromDate, toDate };
}

export function parseDateQuery(req: Request) {
  const { from, to } = req.query as { from?: string; to?: string };
  return parseDateRange(from, to);
}

export function buildContinuousSeries<T>(
  fromDate: Date,
  toDate: Date,
  buckets: Map<string, any>,
  fn: (day: string, bucket?: any) => T
): T[] {
  const out: T[] = [];
  const cursor = new Date(fromDate);

  while (cursor <= toDate) {
    const day = ymd(cursor);
    out.push(fn(day, buckets.get(day)));
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

export function buildOrderWhere(req: Request, fromDate: Date, toDate: Date) {
  const { storeId, type, category, coupon } = req.query as {
    storeId?: string;
    type?: string;
    category?: string;
    coupon?: string;
  };

  const where: any = {
    storeId,
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
  };

  if (type === "category" && category) {
    where.items = {
      some: {
        product: {
          categories: {
            some: {
              category: { name: category },
            },
          },
        },
      },
    };
  }

  if (type === "coupon" && coupon) {
    where.coupons = {
      some: {
        coupon: { code: coupon },
      },
    };
  }

  return where;
}
