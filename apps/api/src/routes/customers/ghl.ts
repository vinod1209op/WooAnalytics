import { Router, Request, Response } from "express";
import { listCustomFields, searchContactsByQuery } from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import {
  asLower,
  fullName,
  parsePositiveInt,
  pickEarliestDate,
  pickLatestDate,
  preferHigherNumber,
} from "./utils";
import { round2 } from "../analytics/utils";
import { buildLoyaltyStats } from "../../lib/loyalty";
import {
  buildFieldDefMap,
  extractCommerceFields,
  formatGhlAddress,
  mapCustomFields,
  normalizeFieldDefs,
} from "./ghl-utils";
import { extractCategories } from "./ghl-product-utils";
import { buildDbAggregates, buildDbFallback } from "./ghl-db";


export function registerGhlCustomersRoute(router: Router) {
  router.get("/ghl", async (req: Request, res: Response) => {
    try {
      if (!process.env.GHL_PIT) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
      const locationId =
        typeof req.query.locationId === "string" && req.query.locationId.trim()
          ? req.query.locationId.trim()
          : process.env.GHL_LOCATION_ID;
      const tag =
        typeof req.query.tag === "string" && req.query.tag.trim()
          ? req.query.tag.trim()
          : "customer";
      const query =
        typeof req.query.query === "string" && req.query.query.trim()
          ? req.query.query.trim()
          : "";
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
      const joinedAfterRaw = parsePositiveInt(
        req.query.joinedAfterDays as string | undefined,
        0,
        0,
        3650
      );
      const joinedAfterDays = joinedAfterRaw > 0 ? joinedAfterRaw : null;
      const activeAfterRaw = parsePositiveInt(
        req.query.activeAfterDays as string | undefined,
        0,
        0,
        3650
      );
      const activeAfterDays = activeAfterRaw > 0 ? activeAfterRaw : null;
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

      const search = await searchContactsByQuery({
        locationId,
        query: query || tag,
        page,
        pageLimit: limit,
      });

      const tagLower = asLower(tag);
      const filtered = tagLower
        ? (search.contacts || []).filter((c) =>
            (c.tags || []).some((t) => asLower(t) === tagLower)
          )
        : search.contacts || [];

      const hydrated = filtered;

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

      const fallbackMap = await buildDbFallback({
        storeId,
        contacts: hydrated,
      });
      const dbAggMap = await buildDbAggregates({
        storeId,
        customerIds: Array.from(new Set(Array.from(fallbackMap.values()).map((row) => row.id))),
      });

      const rows = hydrated.map((contact) => {
        const email = contact.email ?? null;
        const fallback = email ? fallbackMap.get(email.toLowerCase()) : null;
        const dbAgg = fallback ? dbAggMap.get(fallback.id) : null;
        const firstName = contact.firstName ?? fallback?.firstName ?? null;
        const lastName = contact.lastName ?? fallback?.lastName ?? null;
        const name = fullName(firstName, lastName) || null;
        const phone = contact.phone ?? fallback?.phone ?? null;
        const mappedFields = mapCustomFields(contact.customFields || [], defMap);
        const commerce = extractCommerceFields(mappedFields);
        const normalized = normalizeFromCustomFields(contact.customFields || [], {
          fieldDefs: defRecord,
        });
        const dbOrdersCount = dbAgg?.ordersCount ?? null;
        const dbTotalSpend = dbAgg ? round2(dbAgg.totalSpend ?? 0) : null;
        const mergedOrdersCount = preferHigherNumber(
          commerce.totalOrdersCount,
          dbOrdersCount
        );
        const mergedTotalSpend = preferHigherNumber(commerce.totalSpend, dbTotalSpend);
        const mergedFirstOrderDate = pickEarliestDate(
          commerce.firstOrderDate,
          dbAgg?.firstOrderAt
        );
        const mergedLastOrderDate = pickLatestDate(
          commerce.lastOrderDate,
          dbAgg?.lastOrderAt
        );
        const mergedDateAdded = pickEarliestDate(contact.dateAdded ?? null, fallback?.createdAt);
        const mergedDateUpdated = pickLatestDate(
          contact.dateUpdated ?? null,
          fallback?.lastActiveAt,
          commerce.lastOrderDate,
          dbAgg?.lastOrderAt
        );

        return {
          contactId: contact.id,
          email,
          name,
          firstName,
          lastName,
          phone,
          address: formatGhlAddress(contact),
          dateAdded: mergedDateAdded,
          dateUpdated: mergedDateUpdated,
          tags: contact.tags || [],
          db: fallback
            ? {
                customerId: fallback.id,
                wooId: fallback.wooId ?? null,
                createdAt: fallback.createdAt?.toISOString() ?? null,
                lastActiveAt: fallback.lastActiveAt?.toISOString() ?? null,
                ordersCount: dbAgg?.ordersCount ?? null,
                totalSpend: dbAgg ? round2(dbAgg.totalSpend ?? 0) : null,
                firstOrderAt: dbAgg?.firstOrderAt?.toISOString() ?? null,
                lastOrderAt: dbAgg?.lastOrderAt?.toISOString() ?? null,
              }
            : null,
          metrics: {
            totalOrdersCount: mergedOrdersCount,
            totalSpend: mergedTotalSpend != null ? round2(mergedTotalSpend) : null,
            lastOrderDate: mergedLastOrderDate,
            lastOrderValue: commerce.lastOrderValue,
            firstOrderDate: mergedFirstOrderDate,
            firstOrderValue: commerce.firstOrderValue,
            orderSubscription: commerce.orderSubscription,
          },
          loyalty: buildLoyaltyStats(mergedTotalSpend),
          productsOrdered: commerce.productsOrdered,
          intent: {
            primaryIntent: normalized.primaryIntent ?? null,
            mentalState: normalized.mentalState ?? null,
            improvementArea: normalized.improvementArea ?? null,
          },
          productCategories: extractCategories(commerce.productsOrdered ?? []),
        };
      });
      const hasFilters =
        minOrders != null ||
        minSpend != null ||
        joinedAfterDays != null ||
        activeAfterDays != null ||
        intentFilter != null ||
        improvementFilter != null ||
        categoryFilter != null;
      const nowMs = Date.now();
      const joinedCutoff =
        joinedAfterDays != null ? nowMs - joinedAfterDays * 24 * 60 * 60 * 1000 : null;
      const activeCutoff =
        activeAfterDays != null ? nowMs - activeAfterDays * 24 * 60 * 60 * 1000 : null;
      const filteredRows = rows.filter((row) => {
        if (minOrders != null) {
          const orders = row.metrics?.totalOrdersCount ?? 0;
          if (orders < minOrders) return false;
        }
        if (minSpend != null) {
          const spend = row.metrics?.totalSpend ?? 0;
          if (spend < minSpend) return false;
        }
        if (intentFilter) {
          if ((row.intent?.primaryIntent ?? null) !== intentFilter) return false;
        }
        if (improvementFilter) {
          if ((row.intent?.improvementArea ?? null) !== improvementFilter) return false;
        }
        if (categoryFilter) {
          const categories = row.productCategories ?? [];
          if (!categories.some((cat) => cat.toLowerCase() === categoryFilter)) return false;
        }
        if (joinedCutoff != null) {
          if (!row.dateAdded) return false;
          const joinedAt = new Date(row.dateAdded).getTime();
          if (Number.isNaN(joinedAt) || joinedAt < joinedCutoff) return false;
        }
        if (activeCutoff != null) {
          if (!row.dateUpdated) return false;
          const activeAt = new Date(row.dateUpdated).getTime();
          if (Number.isNaN(activeAt) || activeAt < activeCutoff) return false;
        }
        return true;
      });
      const categories = Array.from(
        new Set(filteredRows.flatMap((row) => row.productCategories ?? []))
      ).sort((a, b) => a.localeCompare(b));

      const wantCsv =
        typeof req.query.format === "string" &&
        req.query.format.toLowerCase() === "csv";

      if (wantCsv) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="ghl-customers-${tagLower || "all"}-${page}.csv"`
        );

        const header = [
          "contactId",
          "email",
          "name",
          "phone",
          "dateAdded",
          "dateUpdated",
          "totalOrdersCount",
          "totalSpend",
          "lastOrderDate",
          "lastOrderValue",
          "firstOrderDate",
          "firstOrderValue",
          "orderSubscription",
          "pointsBalance",
          "pointsToNext",
          "nextRewardAt",
          "productsOrdered",
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

        const rowsCsv = filteredRows.map((row) => {
          return [
            row.contactId,
            row.email ?? "",
            row.name ?? "",
            row.phone ?? "",
            row.dateAdded ?? "",
            row.dateUpdated ?? "",
            row.metrics?.totalOrdersCount ?? "",
            row.metrics?.totalSpend ?? "",
            row.metrics?.lastOrderDate ?? "",
            row.metrics?.lastOrderValue ?? "",
            row.metrics?.firstOrderDate ?? "",
            row.metrics?.firstOrderValue ?? "",
            row.metrics?.orderSubscription ?? "",
            row.loyalty?.pointsBalance ?? "",
            row.loyalty?.pointsToNext ?? "",
            row.loyalty?.nextRewardAt ?? "",
            (row.productsOrdered || []).join(" | "),
            (row.tags || []).join(" | "),
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
        page,
        limit,
        count: filteredRows.length,
        total: hasFilters ? filteredRows.length : search.total ?? filteredRows.length,
        nextPage: hasFilters ? null : search.nextPage ?? null,
        categories,
        data: filteredRows,
      });
    } catch (err: any) {
      console.error("GET /customers/ghl error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
