import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { round2 } from "./analytics/utils";

const SAMPLE_PRODUCT_NAMES = [
  "Focus Dose Sample Pack - 10 Capsules",
  "Bliss Dose Sample Pack - 10 Capsules",
  "Pure Dose Sample Pack - 10 Capsules",
  "Pure Dose Enigma Sample Pack - 10 Capsules",
];
const SAMPLE_CATEGORY_NAME = "Capsule samples";
const SAMPLE_NAME_MATCH = { contains: "Sample Pack", mode: "insensitive" as const };
const MOVEMENT_UTM_TOKENS = ["mcrdse", "movement"] as const;

export const movementUtmFilter = {
  AND: MOVEMENT_UTM_TOKENS.map((token) => ({
    utmSource: { contains: token, mode: "insensitive" as const },
  })),
};

const sampleItemFilter: Prisma.OrderItemWhereInput = {
  OR: [
    { name: { in: SAMPLE_PRODUCT_NAMES } },
    { name: SAMPLE_NAME_MATCH },
    {
      product: {
        OR: [
          { name: { in: SAMPLE_PRODUCT_NAMES } },
          { name: SAMPLE_NAME_MATCH },
          {
            categories: {
              some: {
                category: {
                  name: { equals: SAMPLE_CATEGORY_NAME, mode: "insensitive" },
                },
              },
            },
          },
        ],
      },
    },
  ],
};

export function buildComparisonRanges(fromDate: Date, toDate: Date) {
  const endExclusive = new Date(toDate.getTime() + 1);

  const diffMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);
  prevTo.setHours(23, 59, 59, 999);
  const prevFrom = new Date(prevTo.getTime() - diffMs);
  prevFrom.setHours(0, 0, 0, 0);
  const prevEndExclusive = new Date(prevTo.getTime() + 1);

  return { endExclusive, prevFrom, prevEndExclusive };
}

export function buildOrderWheres(params: {
  storeId: string;
  fromDate: Date;
  endExclusive: Date;
  prevFrom: Date;
  prevEndExclusive: Date;
  type?: string;
  category?: string;
  coupon?: string;
}) {
  const { storeId, fromDate, endExclusive, prevFrom, prevEndExclusive, type, category, coupon } =
    params;

  const whereOrders: Prisma.OrderWhereInput = {
    storeId,
    createdAt: {
      gte: fromDate,
      lt: endExclusive,
    },
  };

  const prevWhereOrders: Prisma.OrderWhereInput = {
    storeId,
    createdAt: {
      gte: prevFrom,
      lt: prevEndExclusive,
    },
  };

  if (type === "category" && category) {
    whereOrders.items = {
      some: {
        product: {
          categories: {
            some: {
              category: {
                name: category,
              },
            },
          },
        },
      },
    };

    prevWhereOrders.items = whereOrders.items;
  }

  if (type === "coupon" && coupon) {
    whereOrders.coupons = {
      some: {
        coupon: {
          code: coupon,
        },
      },
    };

    prevWhereOrders.coupons = whereOrders.coupons;
  }

  const leadRateWhere: Prisma.OrderWhereInput = { ...whereOrders };
  const prevLeadRateWhere: Prisma.OrderWhereInput = { ...prevWhereOrders };

  if (type === "coupon") {
    delete (leadRateWhere as { coupons?: unknown }).coupons;
    delete (prevLeadRateWhere as { coupons?: unknown }).coupons;
  }

  return { whereOrders, prevWhereOrders, leadRateWhere, prevLeadRateWhere };
}

export async function getSampleBuyerStats(params: {
  storeId: string;
  fromDate: Date;
  toExclusive: Date;
}) {
  const { storeId, fromDate, toExclusive } = params;
  const sampleOrders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: fromDate, lt: toExclusive },
      items: {
        some: sampleItemFilter,
      },
    },
    select: { customerId: true, billingEmail: true, createdAt: true },
  });

  if (!sampleOrders.length) {
    return { sampleBuyers: 0, sampleRepeatBuyers: 0, sampleRepeatRate: null };
  }

  const firstSampleByCustomer = new Map<string, Date>();
  for (const order of sampleOrders) {
    const emailKey = order.billingEmail?.trim().toLowerCase();
    const key =
      order.customerId != null ? `id:${order.customerId}` : emailKey ? `email:${emailKey}` : null;
    if (!key) continue;
    const existing = firstSampleByCustomer.get(key);
    if (!existing || order.createdAt < existing) {
      firstSampleByCustomer.set(key, order.createdAt);
    }
  }

  const customerIds = Array.from(firstSampleByCustomer.keys())
    .filter((key) => key.startsWith("id:"))
    .map((key) => Number(key.slice(3)))
    .filter((id) => !Number.isNaN(id));
  const billingEmails = Array.from(firstSampleByCustomer.keys())
    .filter((key) => key.startsWith("email:"))
    .map((key) => key.slice(6));
  if (!customerIds.length && !billingEmails.length) {
    return { sampleBuyers: 0, sampleRepeatBuyers: 0, sampleRepeatRate: null };
  }

  const allSampleOrders = await prisma.order.findMany({
    where: {
      storeId,
      OR: [
        customerIds.length ? { customerId: { in: customerIds } } : undefined,
        billingEmails.length ? { billingEmail: { in: billingEmails } } : undefined,
      ].filter(Boolean) as Prisma.OrderWhereInput["OR"],
      items: {
        some: sampleItemFilter,
      },
    },
    select: { customerId: true, billingEmail: true },
  });

  const sampleOrderCounts = new Map<string, number>();
  for (const order of allSampleOrders) {
    const emailKey = order.billingEmail?.trim().toLowerCase();
    const key =
      order.customerId != null ? `id:${order.customerId}` : emailKey ? `email:${emailKey}` : null;
    if (!key) continue;
    sampleOrderCounts.set(key, (sampleOrderCounts.get(key) ?? 0) + 1);
  }

  const repeatBuyerIds = new Set<string>();
  for (const [key, count] of sampleOrderCounts.entries()) {
    if (count >= 2) {
      repeatBuyerIds.add(key);
    }
  }

  const sampleBuyers = firstSampleByCustomer.size;
  const sampleRepeatBuyers = repeatBuyerIds.size;
  const sampleRepeatRate = sampleBuyers ? round2((sampleRepeatBuyers / sampleBuyers) * 100) : null;

  return { sampleBuyers, sampleRepeatBuyers, sampleRepeatRate };
}

type AttributionRow = {
  order?: { customerId: number | null; billingEmail: string | null } | null;
};

export function getUniqueAttributionBuyers(rows: AttributionRow[]) {
  const emailToCustomerId = new Map<string, number>();
  for (const row of rows) {
    const customerId = row.order?.customerId ?? null;
    const email = row.order?.billingEmail?.trim().toLowerCase();
    if (customerId != null && email) {
      emailToCustomerId.set(email, customerId);
    }
  }

  const buyers = new Set<string>();
  for (const row of rows) {
    const customerId = row.order?.customerId ?? null;
    if (customerId != null) {
      buyers.add(`id:${customerId}`);
      continue;
    }
    const email = row.order?.billingEmail?.trim().toLowerCase();
    if (!email) continue;
    const mappedId = emailToCustomerId.get(email);
    if (mappedId != null) {
      buyers.add(`id:${mappedId}`);
      continue;
    }
    buyers.add(`email:${email}`);
  }

  return buyers.size;
}
