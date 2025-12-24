import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import {
  computeTopCategory,
  fullName,
  classifyIdle,
  SEGMENT_PLAYBOOK,
  lastOrderSelect,
  mapOrderItemsWithCategories,
  parsePositiveInt,
  IdleMetrics,
  computeChurnRisk,
} from "./utils";
import { buildIntentTags } from "../../lib/intent-normalizer";

const INTENT_VALUES = new Set([
  "stress",
  "creativity_focus",
  "mood_brainfog",
  "growth",
  "energy",
  "unsure",
  "other",
]);

const IMPROVEMENT_VALUES = new Set([
  "emotional_balance",
  "cognitive_performance",
  "physical_wellbeing",
  "spiritual_growth",
]);
const ORDER_HISTORY_LIMIT: number | null = null;

type CustomerRecord = Awaited<ReturnType<typeof fetchCustomersPage>>[number];

async function fetchCustomersPage(params: {
  storeId: string;
  where: Record<string, unknown>;
  skip?: number;
  take?: number;
  afterId?: number;
}) {
  const baseWhere = params.where as any;
  const idFilter = params.afterId ? { id: { gt: params.afterId } } : {};
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
      orders: { ...lastOrderSelect, ...(ORDER_HISTORY_LIMIT ? { take: ORDER_HISTORY_LIMIT } : {}) },
    },
  });
}

async function mapCustomersToRows(params: {
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

function applyFilters(params: {
  rows: Array<{
    segment?: string;
    topCategory?: string | null;
    lastItems?: Array<{ categories?: string[] }>;
  }>;
  segmentFilter: string | null;
  categoryFilter: string | null;
}) {
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

export function registerInactiveRoute(router: Router) {
  router.get("/inactive", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const days = parsePositiveInt(
        req.query.days as string | undefined,
        30,
        1,
        365
      );
      const limit = parsePositiveInt(
        req.query.limit as string | undefined,
        100,
        1,
        200
      );
      const cursor = parsePositiveInt(
        req.query.cursor as string | undefined,
        0,
        0,
        1_000_000
      );
      const segmentFilter =
        typeof req.query.segment === "string" && req.query.segment.trim()
          ? req.query.segment.trim()
          : null;
      const intentFilter =
        typeof req.query.intent === "string" && req.query.intent.trim()
          ? req.query.intent.trim().toLowerCase()
          : null;
      const safeIntent = intentFilter && INTENT_VALUES.has(intentFilter) ? intentFilter : null;
      const improvementFilter =
        typeof req.query.improvement === "string" && req.query.improvement.trim()
          ? req.query.improvement.trim().toLowerCase()
          : null;
      const safeImprovement =
        improvementFilter && IMPROVEMENT_VALUES.has(improvementFilter)
          ? improvementFilter
          : null;
      const categoryFilter =
        typeof req.query.category === "string" && req.query.category.trim()
          ? req.query.category.trim().toLowerCase()
          : null;

      if (!storeId) {
        return res.status(400).json({ error: "storeId is required" });
      }

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const baseWhere: Record<string, unknown> = {
        storeId,
        email: { not: "" },
        ...(safeIntent ? { primaryIntent: safeIntent as any } : {}),
        ...(safeImprovement ? { improvementArea: safeImprovement as any } : {}),
        orders: {
          some: { createdAt: { lt: cutoff } },
          none: { createdAt: { gte: cutoff } },
        },
      };

      const now = Date.now();
      const customers = await fetchCustomersPage({
        storeId,
        where: baseWhere,
        skip: cursor,
        take: limit,
      });

      const data = await mapCustomersToRows({
        customers,
        storeId,
        days,
        now,
      });

      const filtered = applyFilters({
        rows: data,
        segmentFilter,
        categoryFilter,
      });

      const segmentCounts = filtered.reduce<Record<string, number>>((acc, row) => {
        if (!row.segment) return acc;
        acc[row.segment] = (acc[row.segment] || 0) + 1;
        return acc;
      }, {});

      let totalCount = 0;
      if (!segmentFilter && !categoryFilter) {
        totalCount = await prisma.customer.count({
          where: baseWhere as any,
        });
      } else {
        let lastId = 0;
        const batchSize = 200;
        while (true) {
          const batch = await fetchCustomersPage({
            storeId,
            where: baseWhere,
            afterId: lastId,
            take: batchSize,
          });
          if (!batch.length) break;
          lastId = batch[batch.length - 1].id;
          const rows = await mapCustomersToRows({
            customers: batch,
            storeId,
            days,
            now,
          });
          totalCount += applyFilters({
            rows,
            segmentFilter,
            categoryFilter,
          }).length;
          if (batch.length < batchSize) break;
        }
      }

      const wantCsv =
        typeof req.query.format === "string" &&
        req.query.format.toLowerCase() === "csv";

      if (wantCsv) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="inactive-customers-${storeId}-${days}d.csv"`
        );

        const header = [
          "customerId",
          "email",
          "name",
          "phone",
          "ordersCount",
          "firstOrderAt",
          "lastActiveAt",
          "lastOrderAt",
          "daysSinceLastOrder",
          "ltv",
          "avgDaysBetweenOrders",
          "lastOrderTotal",
          "lastOrderDiscount",
          "lastOrderShipping",
          "lastOrderTax",
          "lastOrderCoupons",
          "lastItems",
          "topCategory",
          "primaryIntent",
          "mentalState",
          "improvementArea",
          "segment",
          "offer",
          "churnRisk",
          "tags",
        ];

        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const rows = filtered.map((row) => {
          const items = row.lastItems
            .map(
              (i) =>
                `${i.name ?? ""} x${i.quantity}` +
                (i.categories?.length ? ` [${i.categories.join("|")}]` : "")
            )
            .join("; ");
          const coupons = row.lastOrderCoupons.join("|");
          return [
            row.customerId,
            row.email,
            row.name ?? "",
            row.phone ?? "",
            row.ordersCount,
            row.firstOrderAt ?? "",
            row.lastActiveAt ?? "",
            row.lastOrderAt ?? "",
            row.metrics?.daysSinceLastOrder ?? "",
            row.metrics?.ltv ?? "",
            row.metrics?.avgDaysBetweenOrders ?? "",
            row.lastOrderTotal ?? "",
            row.lastOrderDiscount ?? "",
            row.lastOrderShipping ?? "",
            row.lastOrderTax ?? "",
            coupons,
            items,
            row.topCategory ?? "",
            row.intent?.primaryIntent ?? "",
            row.intent?.mentalState ?? "",
            row.intent?.improvementArea ?? "",
            row.segment,
            row.offer?.offer ?? "",
            row.churnRisk ?? "",
            (row.tags || []).join("|"),
          ]
            .map(escapeCsv)
            .join(",");
        });

        res.send([header.join(","), ...rows].join("\n"));
        return;
      }

      return res.json({
        storeId,
        days,
        cutoff: cutoff.toISOString(),
        count: filtered.length,
        totalCount,
        nextCursor: customers.length === limit ? cursor + limit : null,
        segmentCounts,
        data: filtered,
      });
    } catch (err: any) {
      console.error("GET /customers/inactive error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
