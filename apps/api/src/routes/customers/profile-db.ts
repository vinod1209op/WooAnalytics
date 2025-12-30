import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import { mapDbOrders, summarizeOrders } from "./profile-db-mappers";

export type LeadCouponSummary = {
  code: string;
  discountType: string | null;
  amount: number;
  minimumSpend: number | null;
  maximumSpend: number | null;
  remainingSpend: number | null;
  eligible: boolean;
};

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

  const mappedOrders = mapDbOrders(orders);
  const { topProducts, topCategories, coupons } = summarizeOrders(mappedOrders);

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
    coupons,
  };
}

export async function buildLeadCouponsSummary(params: {
  storeId?: string;
  totalSpend: number | null;
}): Promise<LeadCouponSummary[]> {
  if (!params.storeId) return [];
  const coupons = await prisma.coupon.findMany({
    where: {
      storeId: params.storeId,
      code: { startsWith: "lead-" },
    },
    select: {
      code: true,
      discountType: true,
      amount: true,
      minimumSpend: true,
      maximumSpend: true,
    },
    orderBy: { code: "asc" },
  });

  const spend = Number.isFinite(params.totalSpend ?? NaN)
    ? (params.totalSpend as number)
    : null;

  return coupons.map((coupon) => {
    const minimumSpend =
      coupon.minimumSpend != null && Number.isFinite(coupon.minimumSpend)
        ? coupon.minimumSpend
        : null;
    const remainingSpend =
      minimumSpend != null && spend != null
        ? round2(Math.max(minimumSpend - spend, 0))
        : null;
    return {
      code: coupon.code,
      discountType: coupon.discountType ?? null,
      amount: coupon.amount ?? 0,
      minimumSpend,
      maximumSpend:
        coupon.maximumSpend != null && Number.isFinite(coupon.maximumSpend)
          ? coupon.maximumSpend
          : null,
      remainingSpend,
      eligible: remainingSpend != null ? remainingSpend <= 0 : false,
    };
  });
}
