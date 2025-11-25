import { Request } from "express";

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseDateRange(from?: string, to?: string) {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (from && to) {
    fromDate = new Date(from + "T00:00:00");
    toDate = new Date(to + "T23:59:59.999");
  } else {
    toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    fromDate.setHours(0, 0, 0, 0);
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
