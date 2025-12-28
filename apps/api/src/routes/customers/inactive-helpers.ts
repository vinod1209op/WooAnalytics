import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import {
  computeTopCategory,
  fullName,
  classifyIdle,
  SEGMENT_PLAYBOOK,
  lastOrderSelect,
  mapOrderItemsWithCategories,
  type IdleMetrics,
  computeChurnRisk,
} from "./utils";
import { buildIntentTags } from "../../lib/intent-normalizer";

const ORDER_HISTORY_LIMIT: number | null = null;

type CustomerRecord = Awaited<ReturnType<typeof fetchCustomersPage>>[number];

export async function fetchCustomersPage(params: {
  storeId: string;
  where: Record<string, unknown>;
  skip?: number;
  take?: number;
  afterId?: number;
}) {
  const baseWhere = params.where as any;
  const idFilter = params.afterId ? { id: { gt: params.afterId } } : {};
  const orderSelect = {
    ...lastOrderSelect,
    take: ORDER_HISTORY_LIMIT ?? undefined,
  };
  return prisma.customer.findMany({
    where: { ...baseWhere, ...idFilter },
    orderBy: { id: "asc" },
    skip: params.skip,
    take: params.take,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      lastActiveAt: true,
      primaryIntent: true,
      mentalState: true,
      improvementArea: true,
      intentUpdatedAt: true,
      rawQuizAnswers: true,
      _count: { select: { orders: true } },
      orders: orderSelect,
    },
  });
}

export async function mapCustomersToRows(params: {
  customers: CustomerRecord[];
  storeId: string;
  days: number;
  now: number;
}) {
  const customerIds = params.customers.map((c) => c.id);
  const aggregates = customerIds.length
    ? await prisma.order.groupBy({
        by: ["customerId"],
        where: { storeId: params.storeId, customerId: { in: customerIds } },
        _count: { _all: true },
        _sum: { total: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      })
    : [];
  const aggMap = new Map<
    number,
    {
      count: number;
      sumTotal: number;
      first: Date | null;
      last: Date | null;
    }
  >(
    aggregates.map((a) => [
      a.customerId!,
      {
        count: a._count._all ?? 0,
        sumTotal: a._sum.total ?? 0,
        first: a._min.createdAt ?? null,
        last: a._max.createdAt ?? null,
      },
    ])
  );

  return params.customers.map((c) => {
    const lastOrder = c.orders[0] ?? null;
    const lastItems = mapOrderItemsWithCategories(lastOrder?.items ?? []);
    const topCategory = computeTopCategory(lastItems);
    const agg = aggMap.get(c.id);
    const orderHistory = c.orders.map((order) => ({
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

    const lastDate = agg?.last ?? lastOrder?.createdAt ?? null;
    const metrics: IdleMetrics = {
      ordersCount: c._count?.orders ?? agg?.count ?? 0,
      firstOrderAt: agg?.first ?? null,
      lastOrderAt: lastDate,
      ltv: agg ? round2(agg.sumTotal) : null,
      avgDaysBetweenOrders:
        agg && agg.count > 1 && agg.first && agg.last
          ? round2(
              (agg.last.getTime() - agg.first.getTime()) /
                (agg.count - 1) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      daysSinceLastOrder: lastDate
        ? round2((params.now - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };

    const segment = classifyIdle(metrics, params.days);
    const play = SEGMENT_PLAYBOOK[segment];
    const tags: string[] = [`idle_${params.days}`];
    tags.push(metrics.ordersCount >= 2 ? "repeat_buyer" : "one_time_buyer");
    if (segment.includes("LOYAL")) tags.push("loyal");
    const intentTags = buildIntentTags({
      primaryIntent: c.primaryIntent as any,
      mentalState: c.mentalState as any,
      improvementArea: c.improvementArea as any,
    });
    tags.push(...intentTags);
    if (c.primaryIntent) tags.push(`goal_${c.primaryIntent}`);
    const churnRisk = computeChurnRisk(metrics);

    return {
      customerId: c.id,
      email: c.email,
      name: fullName(c.firstName, c.lastName) || null,
      phone: c.phone,
      ordersCount: metrics.ordersCount,
      firstOrderAt: metrics.firstOrderAt,
      lastActiveAt: c.lastActiveAt,
      lastOrderAt: metrics.lastOrderAt ?? null,
      lastOrderId: lastOrder?.id ?? null,
      lastOrderTotal: lastOrder ? round2(lastOrder.total ?? 0) : null,
      lastOrderDiscount: lastOrder ? round2(lastOrder.discountTotal ?? 0) : null,
      lastOrderShipping: lastOrder ? round2(lastOrder.shippingTotal ?? 0) : null,
      lastOrderTax: lastOrder ? round2(lastOrder.taxTotal ?? 0) : null,
      lastOrderCoupons: lastOrder
        ? (lastOrder.coupons || []).map((c) => c.coupon?.code).filter(Boolean)
        : [],
      lastItems,
      orderHistory,
      topCategory,
      metrics,
      tags,
      intent: {
        primaryIntent: c.primaryIntent ?? null,
        mentalState: c.mentalState ?? null,
        improvementArea: c.improvementArea ?? null,
        updatedAt: c.intentUpdatedAt?.toISOString() ?? null,
        source: c.primaryIntent ? "ghl" : null,
      },
      segment,
      churnRisk,
      offer: play,
    };
  });
}

export function applyInactiveFilters<T extends {
  segment?: string;
  topCategory?: string | null;
  lastItems?: Array<{ categories?: string[] }>;
}>(params: {
  rows: T[];
  segmentFilter: string | null;
  categoryFilter: string | null;
}): T[] {
  const filteredBySegment = params.segmentFilter
    ? params.rows.filter((d) => d.segment === params.segmentFilter)
    : params.rows;

  if (!params.categoryFilter) {
    return filteredBySegment;
  }

  const target = params.categoryFilter;
  return filteredBySegment.filter((d) => {
    const cat = d.topCategory?.toLowerCase() || "";
    const itemCats = (d.lastItems || [])
      .flatMap((i) => i.categories || [])
      .map((c) => c?.toLowerCase() || "");
    return cat === target || itemCats.includes(target);
  });
}
