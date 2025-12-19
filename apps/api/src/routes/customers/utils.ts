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
