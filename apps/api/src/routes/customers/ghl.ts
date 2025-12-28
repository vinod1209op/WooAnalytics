import { Router, Request, Response } from "express";
import { listCustomFields, searchContactsByQuery } from "../../lib/ghl";
import { asLower, parsePositiveInt } from "./utils";
import { buildFieldDefMap, normalizeFieldDefs } from "./ghl-utils";
import { buildDbAggregates, buildDbFallback } from "./ghl-db";
import {
  applyGhlCustomerFilters,
  buildGhlCustomerRow,
  buildGhlCustomersCsv,
  collectGhlCustomerCategories,
  type GhlCustomerRow,
} from "./ghl-list-helpers";

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

      const rows: GhlCustomerRow[] = hydrated.map((contact) => {
        const email = contact.email ?? null;
        const fallback = email ? fallbackMap.get(email.toLowerCase()) : null;
        const dbAgg = fallback ? dbAggMap.get(fallback.id) : null;
        return buildGhlCustomerRow({
          contact,
          fallback: fallback ?? null,
          dbAgg: dbAgg ?? null,
          defMap,
          defRecord,
        });
      });
      const hasFilters =
        minOrders != null ||
        minSpend != null ||
        joinedAfterDays != null ||
        activeAfterDays != null ||
        intentFilter != null ||
        improvementFilter != null ||
        categoryFilter != null;
      const filteredRows = applyGhlCustomerFilters(rows, {
        minOrders,
        minSpend,
        joinedAfterDays,
        activeAfterDays,
        intentFilter,
        improvementFilter,
        categoryFilter,
      });
      const categories = collectGhlCustomerCategories(filteredRows);

      const wantCsv =
        typeof req.query.format === "string" &&
        req.query.format.toLowerCase() === "csv";

      if (wantCsv) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="ghl-customers-${tagLower || "all"}-${page}.csv"`
        );

        res.send(buildGhlCustomersCsv(filteredRows));
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
