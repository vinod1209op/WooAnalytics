import type { Prisma } from "@prisma/client";
import { round2 } from "../analytics/utils";

export function parsePositiveInt(
  val: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

export function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim();
}

export function asLower(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function toDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(+d) ? null : d;
}

export function pickEarliestDate(...values: Array<string | Date | null | undefined>) {
  let earliest: Date | null = null;
  for (const value of values) {
    const d = toDate(value ?? null);
    if (!d) continue;
    if (!earliest || d.getTime() < earliest.getTime()) earliest = d;
  }
  return earliest ? earliest.toISOString() : null;
}

export function pickLatestDate(...values: Array<string | Date | null | undefined>) {
  let latest: Date | null = null;
  for (const value of values) {
    const d = toDate(value ?? null);
    if (!d) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return latest ? latest.toISOString() : null;
}

export function preferHigherNumber(
  primary?: number | null,
  fallback?: number | null
) {
  const p = Number.isFinite(primary ?? NaN) ? (primary as number) : null;
  const f = Number.isFinite(fallback ?? NaN) ? (fallback as number) : null;
  if (p == null) return f;
  if (f == null) return p;
  return f > p ? f : p;
}

export const lastOrderSelect = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
  select: {
    id: true,
    createdAt: true,
    total: true,
    discountTotal: true,
    shippingTotal: true,
    taxTotal: true,
    coupons: {
      select: {
        coupon: { select: { code: true } },
      },
    },
    items: {
      select: {
        productId: true,
        name: true,
        sku: true,
        quantity: true,
        lineTotal: true,
        product: {
          select: {
            categories: {
              select: { category: { select: { id: true, name: true } } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderFindManyArgs;

type ItemWithCategory = {
  productId: number | null;
  name: string | null;
  sku: string | null;
  quantity: number;
  lineTotal: number | null;
  product?: {
    categories?: {
      category?: { id: number; name: string | null };
    }[];
  } | null;
};

export function mapOrderItemsWithCategories(items: ItemWithCategory[]) {
  return items.map((item) => {
    const categories =
      item.product?.categories
        ?.map((link) => link.category?.name)
        .filter((n): n is string => !!n) ?? [];

    return {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      lineTotal: round2(item.lineTotal ?? 0),
      categories,
    };
  });
}

export function computeTopCategory(
  items: Array<{ categories?: string[] }>
): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const cat of item.categories || []) {
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export type IdleMetrics = {
  ordersCount: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  ltv: number | null;
  avgDaysBetweenOrders: number | null;
  daysSinceLastOrder: number | null;
};

export type IdleSegment =
  | "ONE_TIME_IDLE_30"
  | "REPEAT_IDLE_30"
  | "LOYAL_IDLE_30"
  | "ONE_TIME_IDLE_60"
  | "REPEAT_IDLE_60"
  | "LOYAL_IDLE_60"
  | "ONE_TIME_IDLE_90"
  | "REPEAT_IDLE_90"
  | "LOYAL_IDLE_90";

export function classifyIdle(metrics: IdleMetrics, days: number): IdleSegment {
  const { ordersCount, ltv } = metrics;
  const loyal = ordersCount >= 5 || (ltv ?? 0) >= 500;
  if (days >= 90) {
    if (loyal) return "LOYAL_IDLE_90";
    if (ordersCount >= 2) return "REPEAT_IDLE_90";
    return "ONE_TIME_IDLE_90";
  }
  if (days >= 60) {
    if (loyal) return "LOYAL_IDLE_60";
    if (ordersCount >= 2) return "REPEAT_IDLE_60";
    return "ONE_TIME_IDLE_60";
  }
  if (loyal) return "LOYAL_IDLE_30";
  if (ordersCount >= 2) return "REPEAT_IDLE_30";
  return "ONE_TIME_IDLE_30";
}

export type SegmentOffer = {
  offer: "percent_off" | "free_shipping" | null;
  value?: number;
  message: "reassure" | "replenish" | "nurture" | "reactivate";
  subjectLine: string;
  email: string;
  sms: string;
};

export const SEGMENT_PLAYBOOK: Record<IdleSegment, SegmentOffer> = {
  ONE_TIME_IDLE_30: {
    offer: "free_shipping",
    message: "reassure",
    subjectLine: "We saved free shipping for you",
    email: "Thanks for your first order with us. Enjoy free shipping on your next purchase—let us know if you have any questions.",
    sms: "We saved free shipping for you—come back anytime!",
  },
  REPEAT_IDLE_30: {
    offer: "percent_off",
    value: 10,
    message: "replenish",
    subjectLine: "Running low? Here’s 10% off",
    email: "You’ve picked great products before. Here’s 10% off your next order—perfect for a quick restock.",
    sms: "10% off your next order—grab a quick restock.",
  },
  LOYAL_IDLE_30: {
    offer: null,
    message: "nurture",
    subjectLine: "We picked a few favorites for you",
    email: "You’re one of our best customers. No rush—here are a few new picks we think you’ll like.",
    sms: "We picked a few new favorites for you. No pressure—take a look when you can.",
  },
  ONE_TIME_IDLE_60: {
    offer: "percent_off",
    value: 15,
    message: "reassure",
    subjectLine: "Come back and save 15%",
    email: "We’d love to see you again. Enjoy 15% off your next order—let us know if you have questions.",
    sms: "15% off your next order—come back and save.",
  },
  REPEAT_IDLE_60: {
    offer: "percent_off",
    value: 15,
    message: "replenish",
    subjectLine: "A little thank you—15% off",
    email: "You’ve shopped with us before. Here’s 15% off—perfect timing for a restock.",
    sms: "15% off your next order—thanks for being a repeat customer.",
  },
  LOYAL_IDLE_60: {
    offer: "percent_off",
    value: 10,
    message: "nurture",
    subjectLine: "Checking in with a small thank-you",
    email: "We appreciate you. Here’s 10% off if you need anything—plus a few picks we think you’ll enjoy.",
    sms: "A small thank-you: 10% off your next order.",
  },
  ONE_TIME_IDLE_90: {
    offer: "percent_off",
    value: 20,
    message: "reactivate",
    subjectLine: "We miss you—20% off to return",
    email: "It’s been a while! Enjoy 20% off your next order—come back and see what’s new.",
    sms: "20% off to return—come back and see what’s new.",
  },
  REPEAT_IDLE_90: {
    offer: "percent_off",
    value: 20,
    message: "reactivate",
    subjectLine: "Your next order is 20% off",
    email: "We’d love to have you back. Here’s 20% off your next order—your past picks are waiting.",
    sms: "20% off your next order—come back anytime.",
  },
  LOYAL_IDLE_90: {
    offer: "percent_off",
    value: 15,
    message: "reactivate",
    subjectLine: "A special thank-you—15% off",
    email: "You’ve been an amazing customer. Here’s 15% off if you’d like to return—plus a few new recommendations inside.",
    sms: "15% off as a thank-you—come back when you’re ready.",
  },
};

export function computeChurnRisk(metrics: IdleMetrics): number {
  const days = metrics.daysSinceLastOrder ?? 0;
  const orders = metrics.ordersCount;
  const ltv = metrics.ltv ?? 0;

  const daysScore = Math.min(60, (days / 90) * 60);
  const ordersPenalty = orders <= 1 ? 20 : orders < 3 ? 10 : 0;
  let ltvPenalty = 0;
  if (ltv < 50) ltvPenalty = 15;
  else if (ltv < 200) ltvPenalty = 10;
  else if (ltv < 500) ltvPenalty = 5;

  const score = Math.min(100, Math.round(daysScore + ordersPenalty + ltvPenalty));
  return score;
}
