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
  | "LONG_IDLE_60"
  | "LONG_IDLE_90";

export function classifyIdle(metrics: IdleMetrics, days: number): IdleSegment {
  const { ordersCount, ltv, firstOrderAt, lastOrderAt } = metrics;
  const loyal = ordersCount >= 5 || (ltv ?? 0) >= 500;
  if (days >= 90) return "LONG_IDLE_90";
  if (days >= 60) return "LONG_IDLE_60";
  if (loyal) return "LOYAL_IDLE_30";
  if (ordersCount >= 2) return "REPEAT_IDLE_30";
  return "ONE_TIME_IDLE_30";
}

export type SegmentOffer = {
  offer: "percent_off" | "free_shipping" | null;
  value?: number;
  message: "reassure" | "replenish" | "nurture" | "reactivate";
};

export const SEGMENT_PLAYBOOK: Record<IdleSegment, SegmentOffer> = {
  ONE_TIME_IDLE_30: { offer: "free_shipping", message: "reassure" },
  REPEAT_IDLE_30: { offer: "percent_off", value: 10, message: "replenish" },
  LOYAL_IDLE_30: { offer: null, message: "nurture" },
  LONG_IDLE_60: { offer: "percent_off", value: 15, message: "replenish" },
  LONG_IDLE_90: { offer: "percent_off", value: 20, message: "reactivate" },
};
