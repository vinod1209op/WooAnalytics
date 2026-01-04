import { prisma } from "../../prisma";
import type { GhlContact } from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import { round2 } from "../analytics/utils";
import {
  classifyIdle,
  computeChurnRisk,
  fullName,
  pickEarliestDate,
  pickLatestDate,
  preferHigherNumber,
  type IdleMetrics,
} from "./utils";
import { buildLoyaltyStats } from "../../lib/loyalty";
import { extractCommerceFields, mapCustomFields, type GhlFieldDef } from "./ghl-utils";
import { extractCategories, pickTopCategory } from "./ghl-product-utils";
import { parseDate, daysSince } from "./date-utils";
import { escapeCsv } from "./csv-utils";

export type IdleRow = {
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
  leadCouponUsed?: boolean;
  leadCouponRemainingSpend?: number | null;
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

type IdleRowFilters = {
  days: number;
  nowMs: number;
  minOrders: number | null;
  minSpend: number | null;
  intentFilter: string | null;
  improvementFilter: string | null;
  segmentFilter: string | null;
  categoryFilter: string | null;
};

type IdleRowResult = {
  row: IdleRow;
  segment: string;
  ltv: number | null;
  productCategories: string[];
  daysSinceLastOrder: number | null;
};

export function createIdleRow(params: {
  contact: GhlContact;
  defMap: Map<string, GhlFieldDef>;
  defRecord: Record<string, { name?: string; fieldKey?: string }>;
  filters: IdleRowFilters;
}): IdleRowResult | null {
  const { contact, defMap, defRecord, filters } = params;
  const mappedFields = mapCustomFields(contact.customFields || [], defMap);
  const commerce = extractCommerceFields(mappedFields);
  const normalized = normalizeFromCustomFields(contact.customFields || [], {
    fieldDefs: defRecord,
  });

  const lastOrderAt = parseDate(commerce.lastOrderDate);
  if (!lastOrderAt) return null;
  const daysSinceLast = daysSince(lastOrderAt, filters.nowMs);
  if (daysSinceLast < filters.days) return null;

  const firstOrderAt = parseDate(commerce.firstOrderDate);
  const rawOrders = commerce.totalOrdersCount;
  const ordersCount = rawOrders && rawOrders > 0 ? rawOrders : lastOrderAt ? 1 : 0;
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

  if (filters.minOrders != null && ordersCount < filters.minOrders) return null;
  if (filters.minSpend != null && (ltv ?? 0) < filters.minSpend) return null;

  const segment = classifyIdle(metrics, filters.days);
  const churnRisk = computeChurnRisk(metrics);
  const productsOrdered = commerce.productsOrdered ?? [];
  const productCategories = extractCategories(productsOrdered);
  const topCategory = pickTopCategory(productCategories);

  if (filters.intentFilter && normalized.primaryIntent !== filters.intentFilter) return null;
  if (filters.improvementFilter && normalized.improvementArea !== filters.improvementFilter) {
    return null;
  }
  if (filters.segmentFilter && segment !== filters.segmentFilter) return null;
  if (
    filters.categoryFilter &&
    !productCategories.some((cat) => cat.toLowerCase() === filters.categoryFilter)
  ) {
    return null;
  }

  const email = contact.email ?? null;
  const firstName = contact.firstName ?? null;
  const lastName = contact.lastName ?? null;

  return {
    row: {
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
    },
    segment,
    ltv,
    productCategories,
    daysSinceLastOrder: metrics.daysSinceLastOrder,
  };
}

export async function enrichIdleRowsWithDb(params: {
  storeId?: string;
  rows: IdleRow[];
  nowMs: number;
}) {
  if (!params.storeId || !params.rows.length) return params.rows;

  const emails = Array.from(
    new Set(
      params.rows
        .map((row) => row.email?.toLowerCase())
        .filter(Boolean) as string[]
    )
  );
  if (!emails.length) return params.rows;

  const dbCustomers = await prisma.customer.findMany({
    where: { storeId: params.storeId, email: { in: emails } },
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
  const dbMap = new Map(dbCustomers.map((row) => [row.email.toLowerCase(), row]));
  const ids = dbCustomers.map((row) => row.id);
  const aggregates = ids.length
    ? await prisma.order.groupBy({
        by: ["customerId"],
        where: { storeId: params.storeId, customerId: { in: ids } },
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

  params.rows.forEach((row) => {
    const email = row.email?.toLowerCase();
    if (!email) return;
    const dbCustomer = dbMap.get(email);
    if (!dbCustomer) return;
    const agg = aggMap.get(dbCustomer.id);
    const mergedDateAdded = pickEarliestDate(row.dateAdded, dbCustomer.createdAt);
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
    if (mergedOrdersCount != null) row.metrics.totalOrdersCount = mergedOrdersCount;
    if (mergedTotalSpend != null) row.metrics.totalSpend = round2(mergedTotalSpend);
    row.loyalty = buildLoyaltyStats(row.metrics.totalSpend);
    if (mergedFirstOrderDate) row.metrics.firstOrderDate = mergedFirstOrderDate;
    if (mergedLastOrderDate) row.metrics.lastOrderDate = mergedLastOrderDate;
    if (mergedLastOrderDate) {
      const lastDate = parseDate(mergedLastOrderDate);
      if (lastDate) {
        row.metrics.daysSinceLastOrder = daysSince(lastDate, params.nowMs);
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

  return params.rows;
}

export function buildIdleCsv(rows: IdleRow[]) {
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

  const rowsCsv = rows.map((row) => {
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
    ].map(escapeCsv).join(",");
  });

  return [header.join(","), ...rowsCsv].join("\n");
}
