import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import { mapOrderItemsWithCategories } from "./utils";

const ORDER_HISTORY_LIMIT = 12;

export async function findFallbackCustomer(params: {
  storeId?: string;
  wooId?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  if (!params.storeId) return null;
  const select = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    wooId: true,
    createdAt: true,
    lastActiveAt: true,
    primaryIntent: true,
    mentalState: true,
    improvementArea: true,
    intentUpdatedAt: true,
  } as const;
  if (params.wooId) {
    const customer = await prisma.customer.findFirst({
      where: { storeId: params.storeId, wooId: params.wooId },
      select,
    });
    if (customer) return { customer, matchBy: "wooId" as const };
  }
  if (params.email) {
    const customer = await prisma.customer.findFirst({
      where: { storeId: params.storeId, email: params.email },
      select,
    });
    if (customer) return { customer, matchBy: "email" as const };
  }
  if (params.phone) {
    const phoneDigits = params.phone.replace(/\D/g, "");
    if (phoneDigits) {
      const customer = await prisma.customer.findFirst({
        where: { storeId: params.storeId, phone: { contains: phoneDigits } },
        select,
      });
      if (customer) return { customer, matchBy: "phone" as const };
    }
  }
  return null;
}

export async function loadDbProfile(params: { storeId: string; customerId: number }) {
  const aggregate = await prisma.order.aggregate({
    where: { storeId: params.storeId, customerId: params.customerId },
    _count: { _all: true },
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const orders = await prisma.order.findMany({
    where: { storeId: params.storeId, customerId: params.customerId },
    orderBy: { createdAt: "desc" },
    take: ORDER_HISTORY_LIMIT,
    select: {
      id: true,
      createdAt: true,
      status: true,
      currency: true,
      total: true,
      subtotal: true,
      discountTotal: true,
      shippingTotal: true,
      taxTotal: true,
      paymentMethod: true,
      shippingCountry: true,
      shippingCity: true,
      coupons: {
        select: {
          coupon: { select: { code: true, amount: true, discountType: true } },
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
  });

  const mappedOrders = orders.map((order) => {
    const items = mapOrderItemsWithCategories(order.items ?? []);
    const coupons =
      order.coupons?.map((c) => c.coupon?.code).filter(Boolean) ?? [];
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

  const ordersCount = aggregate._count._all ?? 0;
  const totalSpend = aggregate._sum.total ?? 0;
  const firstOrderAt = aggregate._min.createdAt ?? null;
  const lastOrderAt = aggregate._max.createdAt ?? null;
  const avgOrderValue =
    ordersCount > 0 ? round2(totalSpend / ordersCount) : null;
  const avgDaysBetweenOrders =
    ordersCount > 1 && firstOrderAt && lastOrderAt
      ? round2(
          (lastOrderAt.getTime() - firstOrderAt.getTime()) /
            (ordersCount - 1) /
            (1000 * 60 * 60 * 24)
        )
      : null;
  const daysSinceLastOrder = lastOrderAt
    ? round2((Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    stats: {
      ordersCount,
      totalSpend: round2(totalSpend),
      avgOrderValue,
      firstOrderAt: firstOrderAt?.toISOString() ?? null,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
      avgDaysBetweenOrders,
      daysSinceLastOrder,
    },
    orders: mappedOrders,
    topProducts,
    topCategories,
    coupons: Array.from(couponSet.values()),
  };
}
