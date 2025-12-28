import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import {
  fullName,
  mapOrderItemsWithCategories,
  pickEarliestDate,
  pickLatestDate,
  preferHigherNumber,
} from "./utils";
import { fetchContact, listCustomFields } from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import {
  buildFieldDefMap,
  extractCommerceFields,
  extractWooId,
  formatGhlAddress,
  mapCustomFields,
  normalizeFieldDefs,
} from "./ghl-utils";
import { round2 } from "../analytics/utils";
import { buildLoyaltyStats } from "../../lib/loyalty";
import { buildTopCategoriesFromGhl, buildTopProductsFromGhl } from "./ghl-product-utils";

async function findFallbackCustomer(params: {
  storeId?: string;
  wooId?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  if (!params.storeId) return null;
  if (params.wooId) {
    const customer = await prisma.customer.findFirst({
      where: { storeId: params.storeId, wooId: params.wooId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        wooId: true,
        createdAt: true,
        lastActiveAt: true,
        primaryIntent: true,
        mentalState: true,
        improvementArea: true,
        intentUpdatedAt: true,
      },
    });
    if (customer) return customer;
  }
  if (params.email) {
    const customer = await prisma.customer.findFirst({
      where: { storeId: params.storeId, email: params.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        wooId: true,
        createdAt: true,
        lastActiveAt: true,
        primaryIntent: true,
        mentalState: true,
        improvementArea: true,
        intentUpdatedAt: true,
      },
    });
    if (customer) return customer;
  }
  if (params.phone) {
    const phoneDigits = params.phone.replace(/\D/g, "");
    if (phoneDigits) {
      return prisma.customer.findFirst({
        where: { storeId: params.storeId, phone: { contains: phoneDigits } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          wooId: true,
          createdAt: true,
          lastActiveAt: true,
          primaryIntent: true,
          mentalState: true,
          improvementArea: true,
          intentUpdatedAt: true,
        },
      });
    }
  }
  return null;
}

const ORDER_HISTORY_LIMIT = 12;

async function loadDbProfile(params: { storeId: string; customerId: number }) {
  const aggregate = await prisma.order.aggregate({
    where: { storeId: params.storeId, customerId: params.customerId },
    _count: { _all: true },
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const orders = await prisma.order.findMany({
    where: { storeId: params.storeId, customerId: params.customerId },
    orderBy: { createdAt: "desc" },
    take: ORDER_HISTORY_LIMIT,
    select: {
      id: true,
      createdAt: true,
      status: true,
      currency: true,
      total: true,
      subtotal: true,
      discountTotal: true,
      shippingTotal: true,
      taxTotal: true,
      paymentMethod: true,
      shippingCountry: true,
      shippingCity: true,
      coupons: {
        select: {
          coupon: { select: { code: true, amount: true, discountType: true } },
        },
      },
      items: {
        select: {
          productId: true,
          name: true,
          sku: true,
          quantity: true,
          lineTotal: true,
          product: {
            select: {
              categories: {
                select: { category: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const mappedOrders = orders.map((order) => {
    const items = mapOrderItemsWithCategories(order.items ?? []);
    const coupons =
      order.coupons?.map((c) => c.coupon?.code).filter(Boolean) ?? [];
    return {
      id: order.id,
      createdAt: order.createdAt?.toISOString() ?? null,
      status: order.status ?? null,
      currency: order.currency ?? null,
      total: order.total != null ? round2(order.total) : null,
      subtotal: order.subtotal != null ? round2(order.subtotal) : null,
      discountTotal: order.discountTotal != null ? round2(order.discountTotal) : null,
      shippingTotal: order.shippingTotal != null ? round2(order.shippingTotal) : null,
      taxTotal: order.taxTotal != null ? round2(order.taxTotal) : null,
      paymentMethod: order.paymentMethod ?? null,
      shipping: {
        city: order.shippingCity ?? null,
        country: order.shippingCountry ?? null,
      },
      coupons,
      items,
    };
  });

  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number; categories: string[] }
  >();
  const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const couponSet = new Set<string>();

  mappedOrders.forEach((order) => {
    order.coupons.forEach((code) => couponSet.add(code));
    order.items.forEach((item) => {
      const key = item.productId != null ? String(item.productId) : item.name ?? "item";
      const existing = productMap.get(key);
      const revenue = item.lineTotal ?? 0;
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += revenue;
        item.categories.forEach((cat) => {
          if (!existing.categories.includes(cat)) existing.categories.push(cat);
        });
      } else {
        productMap.set(key, {
          name: item.name ?? "Item",
          quantity: item.quantity,
          revenue,
          categories: [...item.categories],
        });
      }

      item.categories.forEach((cat) => {
        const catEntry = categoryMap.get(cat);
        if (catEntry) {
          catEntry.quantity += item.quantity;
          catEntry.revenue += revenue;
        } else {
          categoryMap.set(cat, { name: cat, quantity: item.quantity, revenue });
        }
      });
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: round2(p.revenue),
      categories: p.categories,
    }));

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((c) => ({
      name: c.name,
      quantity: c.quantity,
      revenue: round2(c.revenue),
    }));

  const ordersCount = aggregate._count._all ?? 0;
  const totalSpend = aggregate._sum.total ?? 0;
  const firstOrderAt = aggregate._min.createdAt ?? null;
  const lastOrderAt = aggregate._max.createdAt ?? null;
  const avgOrderValue =
    ordersCount > 0 ? round2(totalSpend / ordersCount) : null;
  const avgDaysBetweenOrders =
    ordersCount > 1 && firstOrderAt && lastOrderAt
      ? round2(
          (lastOrderAt.getTime() - firstOrderAt.getTime()) /
            (ordersCount - 1) /
            (1000 * 60 * 60 * 24)
        )
      : null;
  const daysSinceLastOrder = lastOrderAt
    ? round2((Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    stats: {
      ordersCount,
      totalSpend: round2(totalSpend),
      avgOrderValue,
      firstOrderAt: firstOrderAt?.toISOString() ?? null,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
      avgDaysBetweenOrders,
      daysSinceLastOrder,
    },
    orders: mappedOrders,
    topProducts,
    topCategories,
    coupons: Array.from(couponSet.values()),
  };
}

export function registerCustomerProfileRoute(router: Router) {
  router.get("/:id/profile", async (req: Request, res: Response) => {
    try {
      const contactId = String(req.params.id || "").trim();
      if (!contactId) return res.status(400).json({ error: "Contact id is required" });

      if (!process.env.GHL_PIT) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
      const locationId =
        typeof req.query.locationId === "string" && req.query.locationId.trim()
          ? req.query.locationId.trim()
          : process.env.GHL_LOCATION_ID;

      const contact = await fetchContact(contactId);
      if (!contact?.id) return res.status(404).json({ error: "Contact not found" });

      let defs: any = null;
      if (locationId) {
        try {
          defs = await listCustomFields(locationId);
        } catch {
          defs = null;
        }
      }
      const defList = normalizeFieldDefs(defs);
      const defMap = buildFieldDefMap(defList);
      const defRecord: Record<string, { name?: string; fieldKey?: string }> = {};
      defList.forEach((def) => {
        defRecord[def.id] = { name: def.name, fieldKey: def.fieldKey };
      });

      const mappedFields = mapCustomFields(contact.customFields || [], defMap);
      const commerce = extractCommerceFields(mappedFields);
      const wooIdFromGhl = extractWooId(mappedFields);
      const normalized = normalizeFromCustomFields(contact.customFields || [], {
        fieldDefs: defRecord,
      });

      const fallback = await findFallbackCustomer({
        storeId,
        wooId: wooIdFromGhl,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
      });
      const dbProfile =
        storeId && fallback?.id
          ? await loadDbProfile({ storeId, customerId: fallback.id })
          : null;

      const firstName = contact.firstName ?? fallback?.firstName ?? null;
      const lastName = contact.lastName ?? fallback?.lastName ?? null;
      const email = contact.email ?? fallback?.email ?? null;
      const phone = contact.phone ?? fallback?.phone ?? null;
      const mergedDateAdded = pickEarliestDate(contact.dateAdded ?? null, fallback?.createdAt);
      const mergedDateUpdated = pickLatestDate(
        contact.dateUpdated ?? null,
        fallback?.lastActiveAt,
        commerce.lastOrderDate,
        dbProfile?.stats?.lastOrderAt ?? null
      );
      const mergedOrdersCount = preferHigherNumber(
        commerce.totalOrdersCount,
        dbProfile?.stats?.ordersCount ?? null
      );
      const mergedTotalSpend = preferHigherNumber(
        commerce.totalSpend,
        dbProfile?.stats?.totalSpend ?? null
      );
      const mergedFirstOrderDate = pickEarliestDate(
        commerce.firstOrderDate,
        dbProfile?.stats?.firstOrderAt ?? null
      );
      const mergedLastOrderDate = pickLatestDate(
        commerce.lastOrderDate,
        dbProfile?.stats?.lastOrderAt ?? null
      );
      const intentPrimary = normalized.primaryIntent ?? fallback?.primaryIntent ?? null;
      const intentMental = normalized.mentalState ?? fallback?.mentalState ?? null;
      const intentImprovement =
        normalized.improvementArea ?? fallback?.improvementArea ?? null;
      const intentUpdatedAt = normalized.primaryIntent
        ? contact.dateUpdated ?? null
        : fallback?.intentUpdatedAt?.toISOString() ?? null;
      const ghlProducts = commerce.productsOrdered ?? [];
      const ghlTopProducts = buildTopProductsFromGhl(ghlProducts);
      const ghlTopCategories = buildTopCategoriesFromGhl(ghlProducts);
      const mergedTopProducts =
        dbProfile?.topProducts?.length ? dbProfile.topProducts : ghlTopProducts;
      const mergedTopCategories =
        dbProfile?.topCategories?.length ? dbProfile.topCategories : ghlTopCategories;
      const loyalty = buildLoyaltyStats(mergedTotalSpend);

      return res.json({
        customer: {
          id: contact.id,
          email,
          name: fullName(firstName, lastName) || null,
          firstName,
          lastName,
          phone,
          address: formatGhlAddress(contact),
          dateAdded: mergedDateAdded,
          dateUpdated: mergedDateUpdated,
          tags: contact.tags || [],
          intent: {
            primaryIntent: intentPrimary,
            mentalState: intentMental,
            improvementArea: intentImprovement,
            updatedAt: intentUpdatedAt,
          },
          rawQuizAnswers: {
            raw: normalized.raw,
            rawFields: normalized.rawFields,
            messaging: normalized.messaging,
            derived: normalized.derived,
          },
        },
        metrics: {
          totalOrdersCount: mergedOrdersCount,
          totalSpend: mergedTotalSpend,
          lastOrderDate: mergedLastOrderDate,
          lastOrderValue: commerce.lastOrderValue,
          firstOrderDate: mergedFirstOrderDate,
          firstOrderValue: commerce.firstOrderValue,
          orderSubscription: commerce.orderSubscription,
        },
        loyalty,
        productsOrdered: commerce.productsOrdered,
        topProducts: mergedTopProducts,
        topCategories: mergedTopCategories,
        customFields: mappedFields,
        db: fallback
          ? {
              customer: {
                id: fallback.id,
                wooId: fallback.wooId ?? null,
                createdAt: fallback.createdAt?.toISOString() ?? null,
                lastActiveAt: fallback.lastActiveAt?.toISOString() ?? null,
              },
              stats: dbProfile?.stats ?? null,
              orders: dbProfile?.orders ?? [],
              topProducts: dbProfile?.topProducts ?? [],
              topCategories: dbProfile?.topCategories ?? [],
              coupons: dbProfile?.coupons ?? [],
            }
          : null,
      });
    } catch (err: any) {
      console.error("GET /customers/:id/profile error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
