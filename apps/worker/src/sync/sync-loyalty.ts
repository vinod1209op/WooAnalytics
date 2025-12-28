import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";
import type { GhlContact } from "./loyalty/types";
import {
  listCustomFields,
  searchContactsByQuery,
  updateContactCustomFields,
} from "./loyalty/ghl-client";
import {
  buildLoyaltyStats,
  extractWooId,
  findFieldId,
} from "./loyalty/loyalty-utils";

const CUSTOMER_TAG = "customer";
const REWARD_THRESHOLDS = [150, 300, 450, 700];

export async function syncLoyalty(ctx: SyncContext): Promise<SyncStats> {
  const warnings: string[] = [];
  let processed = 0;

  if (!process.env.GHL_PIT) {
    return {
      entity: "loyalty",
      processed: 0,
      warnings: ["GHL_PIT missing; skipping loyalty sync"],
    };
  }

  const locationId =
    process.env.GHL_LOCATION_ID && process.env.GHL_LOCATION_ID.trim()
      ? process.env.GHL_LOCATION_ID.trim()
      : null;
  if (!locationId) {
    return {
      entity: "loyalty",
      processed: 0,
      warnings: ["GHL_LOCATION_ID missing; skipping loyalty sync"],
    };
  }

  const defs = await listCustomFields(locationId);
  const fieldIds = {
    pointsBalance: findFieldId(defs, [
      ["points", "balance"],
      ["points", "current"],
    ]),
    pointsLifetime: findFieldId(defs, [
      ["points", "lifetime"],
      ["lifetime", "points"],
    ]),
    pointsToNext: findFieldId(defs, [
      ["points", "next"],
      ["points", "to", "next"],
    ]),
    nextRewardAt: findFieldId(defs, [
      ["next", "reward"],
      ["reward", "next"],
    ]),
    tier: findFieldId(defs, [["tier"]]),
    lastReward: findFieldId(defs, [
      ["last", "reward"],
      ["reward", "last"],
    ]),
  };

  const missingFieldIds = Object.entries(fieldIds)
    .filter(([, id]) => !id)
    .map(([key]) => key);
  if (missingFieldIds.length) {
    warnings.push(`Missing GHL custom fields: ${missingFieldIds.join(", ")}`);
  }

  const contacts: GhlContact[] = [];
  let page = 1;
  while (true) {
    const search = await searchContactsByQuery({
      locationId,
      query: CUSTOMER_TAG,
      page,
      pageLimit: 200,
    });
    if (!search.contacts.length) break;
    contacts.push(...search.contacts);
    if (search.contacts.length < 200) break;
    page += 1;
  }

  const contactByEmail = new Map<string, GhlContact>();
  const contactByWooId = new Map<string, GhlContact>();
  contacts.forEach((contact) => {
    const email = contact.email?.toLowerCase();
    if (email && !contactByEmail.has(email)) {
      contactByEmail.set(email, contact);
    }
    const wooId = contact.customFields
      ? extractWooId(contact.customFields, defs)
      : null;
    if (wooId && !contactByWooId.has(wooId)) {
      contactByWooId.set(wooId, contact);
    }
  });

  const aggregates = await prisma.order.groupBy({
    by: ["customerId"],
    where: { storeId: ctx.store.id },
    _sum: { total: true },
  });
  const ids = aggregates
    .map((row) => row.customerId)
    .filter((id): id is number => typeof id === "number");
  const customers = await prisma.customer.findMany({
    where: { storeId: ctx.store.id, id: { in: ids } },
    select: { id: true, email: true, wooId: true },
  });
  const customerById = new Map(customers.map((row) => [row.id, row]));

  for (const aggregate of aggregates) {
    if (aggregate.customerId == null) continue;
    const customer = customerById.get(aggregate.customerId);
    if (!customer) continue;
    const totalSpend = aggregate._sum.total ?? 0;
    const loyalty = buildLoyaltyStats(totalSpend, REWARD_THRESHOLDS);

    const contact =
      (customer.wooId ? contactByWooId.get(customer.wooId) : null) ||
      (customer.email ? contactByEmail.get(customer.email.toLowerCase()) : null);
    if (!contact) continue;

    const customFields: Array<{ id: string; value: any }> = [];
    if (fieldIds.pointsBalance) {
      customFields.push({ id: fieldIds.pointsBalance, value: loyalty.pointsBalance ?? 0 });
    }
    if (fieldIds.pointsLifetime) {
      customFields.push({ id: fieldIds.pointsLifetime, value: loyalty.pointsLifetime ?? 0 });
    }
    if (fieldIds.pointsToNext && loyalty.pointsToNext != null) {
      customFields.push({ id: fieldIds.pointsToNext, value: loyalty.pointsToNext });
    }
    if (fieldIds.nextRewardAt && loyalty.nextRewardAt != null) {
      customFields.push({ id: fieldIds.nextRewardAt, value: loyalty.nextRewardAt });
    }
    if (fieldIds.lastReward && loyalty.lastRewardAt != null) {
      customFields.push({ id: fieldIds.lastReward, value: loyalty.lastRewardAt });
    }
    if (fieldIds.tier && loyalty.tier) {
      customFields.push({ id: fieldIds.tier, value: loyalty.tier });
    }

    if (!customFields.length) continue;

    try {
      await updateContactCustomFields(contact.id, customFields);
      processed += 1;
    } catch (err: any) {
      warnings.push(err?.message ?? "Unknown loyalty sync error");
    }
  }

  ctx.logger("Loyalty sync complete", { processed, warnings: warnings.length });
  return { entity: "loyalty", processed, warnings };
}
