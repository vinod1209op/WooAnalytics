import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { listCustomFields, searchContactsByQuery } from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import { round2 } from "../analytics/utils";
import {
  asLower,
  classifyIdle,
  computeChurnRisk,
  fullName,
  parsePositiveInt,
  pickEarliestDate,
  pickLatestDate,
  preferHigherNumber,
  type IdleMetrics,
} from "./utils";
import { buildLoyaltyStats } from "../../lib/loyalty";
import {
  buildFieldDefMap,
  extractCommerceFields,
  mapCustomFields,
  normalizeFieldDefs,
} from "./ghl-utils";
import { extractCategories, pickTopCategory } from "./ghl-product-utils";

const DEFAULT_PAGE_LIMIT = 200;

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(+d)) return null;
  return d;
}

function daysSince(date: Date, nowMs: number) {
  return round2((nowMs - date.getTime()) / (1000 * 60 * 60 * 24));
}


type IdleRow = {
  contactId: string;
  email: string | null;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  dateAdded: string | null;
  dateUpdated: string | null;
  tags: string[];
  metrics: {
    totalOrdersCount: number | null;
    totalSpend: number | null;
    lastOrderDate: string | null;
    lastOrderValue: number | null;
    firstOrderDate: string | null;
    firstOrderValue: number | null;
    orderSubscription: string | null;
    daysSinceLastOrder: number | null;
    avgDaysBetweenOrders: number | null;
  };
  loyalty?: {
    pointsBalance: number | null;
    pointsLifetime: number | null;
    pointsToNext: number | null;
    nextRewardAt: number | null;
    lastRewardAt: number | null;
    tier: string | null;
  };
  segment: string | null;
  churnRisk: number | null;
  topCategory: string | null;
  productCategories: string[];
  productsOrdered: string[];
  intent: {
    primaryIntent: string | null;
    mentalState: string | null;
    improvementArea: string | null;
    updatedAt: string | null;
    source: string | null;
  };
  db: null | {
    customerId: number;
    wooId: string | null;
    createdAt: string | null;
    lastActiveAt: string | null;
    ordersCount: number | null;
    totalSpend: number | null;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
};

export function registerGhlIdleCustomersRoute(router: Router) {
  router.get("/ghl-idle", async (req: Request, res: Response) => {
    try {
      if (!process.env.GHL_PIT) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const locationId =
        typeof req.query.locationId === "string" && req.query.locationId.trim()
          ? req.query.locationId.trim()
          : process.env.GHL_LOCATION_ID;
      const storeId =
        typeof req.query.storeId === "string" && req.query.storeId.trim()
          ? req.query.storeId.trim()
          : undefined;
      const tag =
        typeof req.query.tag === "string" && req.query.tag.trim()
          ? req.query.tag.trim()
          : "customer";
      const query =
        typeof req.query.query === "string" && req.query.query.trim()
          ? req.query.query.trim()
          : "";
      const days = parsePositiveInt(req.query.days as string | undefined, 30, 1, 365);
      const page = parsePositiveInt(req.query.page as string | undefined, 1, 1, 10000);
      const limit = parsePositiveInt(req.query.limit as string | undefined, 50, 1, 200);
      const minOrdersRaw = parsePositiveInt(
        req.query.minOrders as string | undefined,
        0,
        0,
        100000
      );
      const minOrders = minOrdersRaw > 0 ? minOrdersRaw : null;
      const minSpendRaw =
        typeof req.query.minSpend === "string" ? Number(req.query.minSpend) : NaN;
      const minSpend = Number.isFinite(minSpendRaw) && minSpendRaw > 0 ? minSpendRaw : null;

      const segmentFilter =
        typeof req.query.segment === "string" && req.query.segment.trim()
          ? req.query.segment.trim()
          : null;
      const intentFilter =
        typeof req.query.intent === "string" && req.query.intent.trim()
          ? req.query.intent.trim().toLowerCase()
          : null;
      const improvementFilter =
        typeof req.query.improvement === "string" && req.query.improvement.trim()
          ? req.query.improvement.trim().toLowerCase()
          : null;
      const categoryFilter =
        typeof req.query.category === "string" && req.query.category.trim()
          ? req.query.category.trim().toLowerCase()
          : null;

      if (!locationId) {
        return res.status(400).json({ error: "GHL_LOCATION_ID is required" });
      }

      let defs: any = null;
      try {
        defs = await listCustomFields(locationId);
      } catch {
        defs = null;
      }
      const defList = normalizeFieldDefs(defs);
      const defMap = buildFieldDefMap(defList);
      const defRecord: Record<string, { name?: string; fieldKey?: string }> = {};
      defList.forEach((def) => {
        defRecord[def.id] = { name: def.name, fieldKey: def.fieldKey };
      });

      const nowMs = Date.now();
      const tagLower = asLower(tag);
      const filteredRows: IdleRow[] = [];
      const segmentSummary: Record<
        string,
        { count: number; ltv: number; daysSum: number; daysCount: number }
      > = {};
      const categorySet = new Set<string>();

      let searchPage = 1;
      while (true) {
        const search = await searchContactsByQuery({
          locationId,
          query: query || tag,
          page: searchPage,
          pageLimit: DEFAULT_PAGE_LIMIT,
        });

        const contacts = tagLower
          ? (search.contacts || []).filter((c) =>
              (c.tags || []).some((t) => asLower(t) === tagLower)
            )
          : search.contacts || [];

        if (!contacts.length) break;

        for (const contact of contacts) {
          const mappedFields = mapCustomFields(contact.customFields || [], defMap);
          const commerce = extractCommerceFields(mappedFields);
          const normalized = normalizeFromCustomFields(contact.customFields || [], {
            fieldDefs: defRecord,
          });

          const lastOrderAt = parseDate(commerce.lastOrderDate);
          if (!lastOrderAt) continue;
          const daysSinceLast = daysSince(lastOrderAt, nowMs);
          if (daysSinceLast < days) continue;

          const firstOrderAt = parseDate(commerce.firstOrderDate);
          const rawOrders = commerce.totalOrdersCount;
          const ordersCount =
            rawOrders && rawOrders > 0 ? rawOrders : lastOrderAt ? 1 : 0;
          const ltv = commerce.totalSpend ?? null;
          const avgDaysBetweenOrders =
            ordersCount > 1 && firstOrderAt
              ? round2(
                  (lastOrderAt.getTime() - firstOrderAt.getTime()) /
                    (ordersCount - 1) /
                    (1000 * 60 * 60 * 24)
                )
              : null;

          const metrics: IdleMetrics = {
            ordersCount,
            firstOrderAt,
            lastOrderAt,
            ltv,
            avgDaysBetweenOrders,
            daysSinceLastOrder: daysSinceLast,
          };

          if (minOrders != null && ordersCount < minOrders) continue;
          if (minSpend != null && (ltv ?? 0) < minSpend) continue;

          const segment = classifyIdle(metrics, days);
          const churnRisk = computeChurnRisk(metrics);
          const productsOrdered = commerce.productsOrdered ?? [];
          const productCategories = extractCategories(productsOrdered);
          const topCategory = pickTopCategory(productCategories);

          productCategories.forEach((cat) => categorySet.add(cat));

          if (intentFilter && normalized.primaryIntent !== intentFilter) continue;
          if (improvementFilter && normalized.improvementArea !== improvementFilter) continue;
          if (segmentFilter && segment !== segmentFilter) continue;
          if (
            categoryFilter &&
            !productCategories.some((cat) => cat.toLowerCase() === categoryFilter)
          ) {
            continue;
          }

          if (!segmentSummary[segment]) {
            segmentSummary[segment] = { count: 0, ltv: 0, daysSum: 0, daysCount: 0 };
          }
          const summary = segmentSummary[segment];
          summary.count += 1;
          summary.ltv += ltv ?? 0;
          if (metrics.daysSinceLastOrder != null) {
            summary.daysSum += metrics.daysSinceLastOrder;
            summary.daysCount += 1;
          }

          const email = contact.email ?? null;
          const firstName = contact.firstName ?? null;
          const lastName = contact.lastName ?? null;

          filteredRows.push({
            contactId: contact.id,
            email,
            name: fullName(firstName, lastName) || null,
            firstName,
            lastName,
            phone: contact.phone ?? null,
            dateAdded: contact.dateAdded ?? null,
            dateUpdated: contact.dateUpdated ?? null,
            tags: contact.tags || [],
            metrics: {
              totalOrdersCount: ordersCount ?? null,
              totalSpend: ltv,
              lastOrderDate: commerce.lastOrderDate ?? null,
              lastOrderValue: commerce.lastOrderValue ?? null,
              firstOrderDate: commerce.firstOrderDate ?? null,
              firstOrderValue: commerce.firstOrderValue ?? null,
              orderSubscription: commerce.orderSubscription ?? null,
              daysSinceLastOrder: metrics.daysSinceLastOrder,
              avgDaysBetweenOrders: metrics.avgDaysBetweenOrders,
            },
            loyalty: buildLoyaltyStats(ltv),
            segment,
            churnRisk,
            topCategory,
            productCategories,
            productsOrdered,
            intent: {
              primaryIntent: normalized.primaryIntent ?? null,
              mentalState: normalized.mentalState ?? null,
              improvementArea: normalized.improvementArea ?? null,
              updatedAt: contact.dateUpdated ?? null,
              source: normalized.primaryIntent ? "ghl" : null,
            },
            db: null,
          });
        }

        if ((search.contacts || []).length < DEFAULT_PAGE_LIMIT) break;
        searchPage += 1;
      }

      const totalCount = filteredRows.length;
      const start = (page - 1) * limit;
      const pagedRows = filteredRows.slice(start, start + limit);

      if (storeId && pagedRows.length) {
        const emails = Array.from(
          new Set(
            pagedRows
              .map((row) => row.email?.toLowerCase())
              .filter(Boolean) as string[]
          )
        );
        if (emails.length) {
          const dbCustomers = await prisma.customer.findMany({
            where: { storeId, email: { in: emails } },
            select: {
              id: true,
              wooId: true,
              email: true,
              createdAt: true,
              lastActiveAt: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          });
          const dbMap = new Map(
            dbCustomers.map((row) => [row.email.toLowerCase(), row])
          );
          const ids = dbCustomers.map((row) => row.id);
          const aggregates = ids.length
            ? await prisma.order.groupBy({
                by: ["customerId"],
                where: { storeId, customerId: { in: ids } },
                _count: { _all: true },
                _sum: { total: true },
                _min: { createdAt: true },
                _max: { createdAt: true },
              })
            : [];
          const aggMap = new Map(
            aggregates.map((row) => [
              row.customerId!,
              {
                ordersCount: row._count._all ?? 0,
                totalSpend: row._sum.total ?? 0,
                firstOrderAt: row._min.createdAt ?? null,
                lastOrderAt: row._max.createdAt ?? null,
              },
            ])
          );

          pagedRows.forEach((row) => {
            const email = row.email?.toLowerCase();
            if (!email) return;
            const dbCustomer = dbMap.get(email);
            if (!dbCustomer) return;
            const agg = aggMap.get(dbCustomer.id);
            const mergedDateAdded = pickEarliestDate(
              row.dateAdded,
              dbCustomer.createdAt
            );
            const mergedDateUpdated = pickLatestDate(
              row.dateUpdated,
              dbCustomer.lastActiveAt,
              agg?.lastOrderAt,
              row.metrics.lastOrderDate
            );
            const mergedOrdersCount = preferHigherNumber(
              row.metrics.totalOrdersCount,
              agg?.ordersCount ?? null
            );
            const mergedTotalSpend = preferHigherNumber(
              row.metrics.totalSpend,
              agg ? round2(agg.totalSpend ?? 0) : null
            );
            const mergedFirstOrderDate = pickEarliestDate(
              row.metrics.firstOrderDate,
              agg?.firstOrderAt
            );
            const mergedLastOrderDate = pickLatestDate(
              row.metrics.lastOrderDate,
              agg?.lastOrderAt
            );

            if (!row.firstName && dbCustomer.firstName) row.firstName = dbCustomer.firstName;
            if (!row.lastName && dbCustomer.lastName) row.lastName = dbCustomer.lastName;
            if (!row.name) {
              row.name = fullName(row.firstName, row.lastName) || null;
            }
            if (!row.phone && dbCustomer.phone) row.phone = dbCustomer.phone;

            if (mergedDateAdded) row.dateAdded = mergedDateAdded;
            if (mergedDateUpdated) row.dateUpdated = mergedDateUpdated;
            if (mergedOrdersCount != null) {
              row.metrics.totalOrdersCount = mergedOrdersCount;
            }
            if (mergedTotalSpend != null) {
              row.metrics.totalSpend = round2(mergedTotalSpend);
            }
            row.loyalty = buildLoyaltyStats(row.metrics.totalSpend);
            if (mergedFirstOrderDate) row.metrics.firstOrderDate = mergedFirstOrderDate;
            if (mergedLastOrderDate) row.metrics.lastOrderDate = mergedLastOrderDate;
            if (mergedLastOrderDate) {
              const lastDate = parseDate(mergedLastOrderDate);
              if (lastDate) {
                row.metrics.daysSinceLastOrder = daysSince(lastDate, Date.now());
              }
            }
            if (
              mergedOrdersCount != null &&
              mergedOrdersCount > 1 &&
              mergedFirstOrderDate &&
              mergedLastOrderDate
            ) {
              const first = parseDate(mergedFirstOrderDate);
              const last = parseDate(mergedLastOrderDate);
              if (first && last) {
                row.metrics.avgDaysBetweenOrders = round2(
                  (last.getTime() - first.getTime()) /
                    (mergedOrdersCount - 1) /
                    (1000 * 60 * 60 * 24)
                );
              }
            }
            row.db = {
              customerId: dbCustomer.id,
              wooId: dbCustomer.wooId ?? null,
              createdAt: dbCustomer.createdAt?.toISOString() ?? null,
              lastActiveAt: dbCustomer.lastActiveAt?.toISOString() ?? null,
              ordersCount: agg?.ordersCount ?? null,
              totalSpend: agg ? round2(agg.totalSpend ?? 0) : null,
              firstOrderAt: agg?.firstOrderAt?.toISOString() ?? null,
              lastOrderAt: agg?.lastOrderAt?.toISOString() ?? null,
            };
          });
        }
      }

      const wantCsv =
        typeof req.query.format === "string" &&
        req.query.format.toLowerCase() === "csv";

      if (wantCsv) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="ghl-idle-customers-${days}d-${page}.csv"`
        );

        const header = [
          "contactId",
          "email",
          "name",
          "phone",
          "ordersCount",
          "totalSpend",
          "lastOrderDate",
          "lastOrderValue",
          "daysSinceLastOrder",
          "segment",
          "churnRisk",
          "primaryIntent",
          "improvementArea",
          "productCategories",
          "productsOrdered",
        ];

        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const rowsCsv = pagedRows.map((row) => {
          return [
            row.contactId,
            row.email ?? "",
            row.name ?? "",
            row.phone ?? "",
            row.metrics.totalOrdersCount ?? "",
            row.metrics.totalSpend ?? "",
            row.metrics.lastOrderDate ?? "",
            row.metrics.lastOrderValue ?? "",
            row.metrics.daysSinceLastOrder ?? "",
            row.segment ?? "",
            row.churnRisk ?? "",
            row.intent.primaryIntent ?? "",
            row.intent.improvementArea ?? "",
            row.productCategories.join(" | "),
            row.productsOrdered.join(" | "),
          ]
            .map(escapeCsv)
            .join(",");
        });

        res.send([header.join(","), ...rowsCsv].join("\n"));
        return;
      }

      return res.json({
        locationId,
        tag,
        days,
        cutoff: new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString(),
        page,
        limit,
        count: pagedRows.length,
        totalCount,
        segmentSummary,
        categories: Array.from(categorySet.values()).sort((a, b) => a.localeCompare(b)),
        data: pagedRows,
      });
    } catch (err: any) {
      console.error("GET /customers/ghl-idle error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
