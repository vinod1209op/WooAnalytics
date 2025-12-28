import { Router, Request, Response } from "express";
import { listCustomFields, searchContactsByQuery } from "../../lib/ghl";
import { asLower, parsePositiveInt } from "./utils";
import { buildFieldDefMap, normalizeFieldDefs } from "./ghl-utils";
import {
  buildIdleCsv,
  createIdleRow,
  enrichIdleRowsWithDb,
  type IdleRow,
} from "./ghl-idle-helpers";

const DEFAULT_PAGE_LIMIT = 200;

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
          const result = createIdleRow({
            contact,
            defMap,
            defRecord,
            filters: {
              days,
              nowMs,
              minOrders,
              minSpend,
              intentFilter,
              improvementFilter,
              segmentFilter,
              categoryFilter,
            },
          });
          if (!result) continue;

          const { row, segment, ltv, productCategories, daysSinceLastOrder } = result;

          productCategories.forEach((cat) => categorySet.add(cat));

          if (!segmentSummary[segment]) {
            segmentSummary[segment] = { count: 0, ltv: 0, daysSum: 0, daysCount: 0 };
          }
          const summary = segmentSummary[segment];
          summary.count += 1;
          summary.ltv += ltv ?? 0;
          if (daysSinceLastOrder != null) {
            summary.daysSum += daysSinceLastOrder;
            summary.daysCount += 1;
          }
          filteredRows.push(row);
        }

        if ((search.contacts || []).length < DEFAULT_PAGE_LIMIT) break;
        searchPage += 1;
      }

      const totalCount = filteredRows.length;
      const start = (page - 1) * limit;
      const pagedRows = filteredRows.slice(start, start + limit);

      if (storeId && pagedRows.length) {
        await enrichIdleRowsWithDb({ storeId, rows: pagedRows, nowMs });
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

        res.send(buildIdleCsv(pagedRows));
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
