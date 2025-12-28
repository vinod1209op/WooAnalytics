import { Router, Request, Response } from "express";
import {
  fullName,
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
import { buildLoyaltyStats } from "../../lib/loyalty";
import { buildTopCategoriesFromGhl, buildTopProductsFromGhl } from "./ghl-product-utils";
import {
  buildLeadCouponsSummary,
  findFallbackCustomer,
  loadDbProfile,
} from "./profile-db";

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

      const fallbackMatch = await findFallbackCustomer({
        storeId,
        wooId: wooIdFromGhl,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
      });
      const fallback = fallbackMatch?.customer ?? null;
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

      const metrics = {
        totalOrdersCount: mergedOrdersCount,
        totalSpend: mergedTotalSpend,
        lastOrderDate: mergedLastOrderDate,
        lastOrderValue: commerce.lastOrderValue,
        firstOrderDate: mergedFirstOrderDate,
        firstOrderValue: commerce.firstOrderValue,
        orderSubscription: commerce.orderSubscription,
      };
      const leadCoupons = await buildLeadCouponsSummary({
        storeId,
        totalSpend: metrics.totalSpend,
      });

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
        metrics,
        loyalty,
        leadCoupons,
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
        debug: {
          storeIdProvided: Boolean(storeId),
          ghlContactId: contact.id,
          ghlEmail: contact.email ?? null,
          dbMatch: fallback
            ? {
                matchBy: fallbackMatch?.matchBy ?? null,
                customerId: fallback.id,
                wooId: fallback.wooId ?? null,
                email: fallback.email ?? null,
              }
            : null,
        },
      });
    } catch (err: any) {
      console.error("GET /customers/:id/profile error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
