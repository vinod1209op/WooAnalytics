import { round2 } from "../analytics/utils";
import { mapOrderItemsWithCategories } from "./utils";

type OrderRecord = {
  id: number;
  createdAt: Date | null;
  total: number | null;
  discountTotal: number | null;
  shippingTotal: number | null;
  taxTotal: number | null;
  coupons?: Array<{ coupon?: { code?: string | null } | null }>;
  items?: any[];
};

export function buildOrderHistory(orders: OrderRecord[]) {
  return orders.map((order) => ({
    orderId: order.id,
    createdAt: order.createdAt?.toISOString() ?? null,
    total: order.total != null ? round2(order.total) : null,
    discountTotal: order.discountTotal != null ? round2(order.discountTotal) : null,
    shippingTotal: order.shippingTotal != null ? round2(order.shippingTotal) : null,
    taxTotal: order.taxTotal != null ? round2(order.taxTotal) : null,
    coupons: (order.coupons || [])
      .map((coupon) => coupon.coupon?.code)
      .filter(Boolean),
    items: mapOrderItemsWithCategories(order.items ?? []),
  }));
}
