import { round2 } from "../analytics/utils";
import { mapOrderItemsWithCategories } from "./utils";

type DbOrder = {
  id: number;
  createdAt: Date | null;
  status: string | null;
  currency: string | null;
  total: number | null;
  subtotal: number | null;
  discountTotal: number | null;
  shippingTotal: number | null;
  taxTotal: number | null;
  paymentMethod: string | null;
  shippingCountry: string | null;
  shippingCity: string | null;
  coupons?: Array<{ coupon?: { code?: string | null; amount?: number | null; discountType?: string | null } }>;
  items?: any[];
};

export type MappedOrder = {
  id: number;
  createdAt: string | null;
  status: string | null;
  currency: string | null;
  total: number | null;
  subtotal: number | null;
  discountTotal: number | null;
  shippingTotal: number | null;
  taxTotal: number | null;
  paymentMethod: string | null;
  shipping: {
    city: string | null;
    country: string | null;
  };
  coupons: string[];
  items: ReturnType<typeof mapOrderItemsWithCategories>;
};

export function mapDbOrders(orders: DbOrder[]) {
  return orders.map((order) => {
    const items = mapOrderItemsWithCategories(order.items ?? []);
    const coupons =
      order.coupons
        ?.map((c) => c.coupon?.code)
        .filter((code): code is string => Boolean(code)) ?? [];
    return {
      id: order.id,
      createdAt: order.createdAt?.toISOString() ?? null,
      status: order.status ?? null,
      currency: order.currency ?? null,
      total: order.total != null ? round2(order.total) : null,
      subtotal: order.subtotal != null ? round2(order.subtotal) : null,
      discountTotal: order.discountTotal != null ? round2(order.discountTotal) : null,
      shippingTotal: order.shippingTotal != null ? round2(order.shippingTotal) : null,
      taxTotal: order.taxTotal != null ? round2(order.taxTotal) : null,
      paymentMethod: order.paymentMethod ?? null,
      shipping: {
        city: order.shippingCity ?? null,
        country: order.shippingCountry ?? null,
      },
      coupons,
      items,
    };
  });
}

export function summarizeOrders(mappedOrders: MappedOrder[]) {
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number; categories: string[] }
  >();
  const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const couponSet = new Set<string>();

  mappedOrders.forEach((order) => {
    order.coupons.forEach((code) => couponSet.add(code));
    order.items.forEach((item) => {
      const key = item.productId != null ? String(item.productId) : item.name ?? "item";
      const existing = productMap.get(key);
      const revenue = item.lineTotal ?? 0;
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += revenue;
        item.categories.forEach((cat) => {
          if (!existing.categories.includes(cat)) existing.categories.push(cat);
        });
      } else {
        productMap.set(key, {
          name: item.name ?? "Item",
          quantity: item.quantity,
          revenue,
          categories: [...item.categories],
        });
      }

      item.categories.forEach((cat) => {
        const catEntry = categoryMap.get(cat);
        if (catEntry) {
          catEntry.quantity += item.quantity;
          catEntry.revenue += revenue;
        } else {
          categoryMap.set(cat, { name: cat, quantity: item.quantity, revenue });
        }
      });
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: round2(p.revenue),
      categories: p.categories,
    }));

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((c) => ({
      name: c.name,
      quantity: c.quantity,
      revenue: round2(c.revenue),
    }));

  return {
    topProducts,
    topCategories,
    coupons: Array.from(couponSet.values()),
  };
}
