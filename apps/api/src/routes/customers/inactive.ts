import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { parsePositiveInt } from "./utils";
import {
  applyInactiveFilters,
  fetchCustomersPage,
  mapCustomersToRows,
} from "./inactive-helpers";
import { escapeCsv } from "./csv-utils";

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

      const filtered = applyInactiveFilters({
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
          totalCount += applyInactiveFilters({
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
          ].map(escapeCsv).join(",");
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
