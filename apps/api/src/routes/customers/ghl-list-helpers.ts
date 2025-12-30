import type { GhlContact } from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import { round2 } from "../analytics/utils";
import { buildLoyaltyStats } from "../../lib/loyalty";
import {
  extractCommerceFields,
  formatGhlAddress,
  mapCustomFields,
  type GhlFieldDef,
} from "./ghl-utils";
import { extractCategories } from "./ghl-product-utils";
import {
  fullName,
  pickEarliestDate,
  pickLatestDate,
  preferHigherNumber,
} from "./utils";

type DbAgg = {
  ordersCount: number;
  totalSpend: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
};

type DbFallback = {
  id: number;
  wooId?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt?: Date;
  lastActiveAt?: Date | null;
};

export type GhlCustomerRow = {
  contactId: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  dateAdded: string | null;
  dateUpdated: string | null;
  tags: string[];
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
  metrics: {
    totalOrdersCount: number | null;
    totalSpend: number | null;
    lastOrderDate: string | null;
    lastOrderValue: number | null;
    firstOrderDate: string | null;
    firstOrderValue: number | null;
    orderSubscription: string | null;
  };
  loyalty: {
    pointsBalance: number | null;
    pointsLifetime: number | null;
    pointsToNext: number | null;
    nextRewardAt: number | null;
    lastRewardAt: number | null;
    tier: string | null;
  };
  productsOrdered: string[] | null | undefined;
  intent: {
    primaryIntent: string | null;
    mentalState: string | null;
    improvementArea: string | null;
  };
  productCategories: string[];
};

export function buildGhlCustomerRow(params: {
  contact: GhlContact;
  fallback: DbFallback | null;
  dbAgg: DbAgg | null;
  defMap: Map<string, GhlFieldDef>;
  defRecord: Record<string, { name?: string; fieldKey?: string }>;
}): GhlCustomerRow {
  const { contact, fallback, dbAgg, defMap, defRecord } = params;
  const email = contact.email ?? null;
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
  const mergedOrdersCount = preferHigherNumber(commerce.totalOrdersCount, dbOrdersCount);
  const mergedTotalSpend = preferHigherNumber(commerce.totalSpend, dbTotalSpend);
  const mergedFirstOrderDate = pickEarliestDate(commerce.firstOrderDate, dbAgg?.firstOrderAt);
  const mergedLastOrderDate = pickLatestDate(commerce.lastOrderDate, dbAgg?.lastOrderAt);
  const mergedDateAdded = pickEarliestDate(contact.dateAdded ?? null, fallback?.createdAt);
  const mergedDateUpdated = pickLatestDate(
    commerce.lastOrderDate,
    dbAgg?.lastOrderAt,
    contact.dateUpdated ?? null,
    fallback?.lastActiveAt
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
}

export function applyGhlCustomerFilters(
  rows: GhlCustomerRow[],
  filters: {
    minOrders: number | null;
    minSpend: number | null;
    joinedAfterDays: number | null;
    activeAfterDays: number | null;
    intentFilter: string | null;
    improvementFilter: string | null;
    categoryFilter: string | null;
  }
) {
  const nowMs = Date.now();
  const joinedCutoff =
    filters.joinedAfterDays != null
      ? nowMs - filters.joinedAfterDays * 24 * 60 * 60 * 1000
      : null;
  const activeCutoff =
    filters.activeAfterDays != null
      ? nowMs - filters.activeAfterDays * 24 * 60 * 60 * 1000
      : null;

  return rows.filter((row) => {
    if (filters.minOrders != null) {
      const orders = row.metrics?.totalOrdersCount ?? 0;
      if (orders < filters.minOrders) return false;
    }
    if (filters.minSpend != null) {
      const spend = row.metrics?.totalSpend ?? 0;
      if (spend < filters.minSpend) return false;
    }
    if (filters.intentFilter) {
      if ((row.intent?.primaryIntent ?? null) !== filters.intentFilter) return false;
    }
    if (filters.improvementFilter) {
      if ((row.intent?.improvementArea ?? null) !== filters.improvementFilter) return false;
    }
    if (filters.categoryFilter) {
      const categories = row.productCategories ?? [];
      if (!categories.some((cat) => cat.toLowerCase() === filters.categoryFilter)) {
        return false;
      }
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
}

export function collectGhlCustomerCategories(rows: GhlCustomerRow[]) {
  return Array.from(
    new Set(rows.flatMap((row) => row.productCategories ?? []))
  ).sort((a, b) => a.localeCompare(b));
}

export function buildGhlCustomersCsv(rows: GhlCustomerRow[]) {
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

  const rowsCsv = rows.map((row) => {
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

  return [header.join(","), ...rowsCsv].join("\n");
}
