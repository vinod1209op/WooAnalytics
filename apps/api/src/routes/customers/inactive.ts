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
} from "./utils";

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

      if (!storeId) {
        return res.status(400).json({ error: "storeId is required" });
      }

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const customers = await prisma.customer.findMany({
        where: {
          storeId,
          email: { not: "" },
          orders: {
            some: { createdAt: { lt: cutoff } },
            none: { createdAt: { gte: cutoff } },
          },
        },
        orderBy: { id: "asc" },
        skip: cursor,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          lastActiveAt: true,
          _count: { select: { orders: true } },
          orders: lastOrderSelect,
        },
      });

      const now = Date.now();
      const customerIds = customers.map((c) => c.id);
      const aggregates = customerIds.length
        ? await prisma.order.groupBy({
            by: ["customerId"],
            where: { storeId, customerId: { in: customerIds } },
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

      const data = customers.map((c) => {
        const lastOrder = c.orders[0] ?? null;
        const lastItems = mapOrderItemsWithCategories(lastOrder?.items ?? []);
        const topCategory = computeTopCategory(lastItems);
        const agg = aggMap.get(c.id);

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
            ? round2((now - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        };

        const segment = classifyIdle(metrics, days);
        const play = SEGMENT_PLAYBOOK[segment];

        return {
          customerId: c.id,
          email: c.email,
          name: fullName(c.firstName, c.lastName) || null,
          phone: c.phone,
          ordersCount: metrics.ordersCount,
          firstOrderAt: metrics.firstOrderAt,
          lastActiveAt: c.lastActiveAt,
          lastOrderAt: metrics.lastOrderAt ?? null,
          lastOrderTotal: lastOrder ? round2(lastOrder.total ?? 0) : null,
          lastOrderDiscount: lastOrder ? round2(lastOrder.discountTotal ?? 0) : null,
          lastOrderShipping: lastOrder ? round2(lastOrder.shippingTotal ?? 0) : null,
          lastOrderTax: lastOrder ? round2(lastOrder.taxTotal ?? 0) : null,
          lastOrderCoupons: lastOrder
            ? (lastOrder.coupons || [])
                .map((c) => c.coupon?.code)
                .filter(Boolean)
            : [],
          lastItems,
          topCategory,
          metrics,
          intent: { primaryGoal: null, source: "ghl", updatedAt: null },
          segment,
          offer: play,
        };
      });

      const filtered = segmentFilter ? data.filter((d) => d.segment === segmentFilter) : data;

      const segmentCounts = filtered.reduce<Record<string, number>>((acc, row) => {
        if (!row.segment) return acc;
        acc[row.segment] = (acc[row.segment] || 0) + 1;
        return acc;
      }, {});

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
          "segment",
          "offer",
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
            row.segment,
            row.offer?.offer ?? "",
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
