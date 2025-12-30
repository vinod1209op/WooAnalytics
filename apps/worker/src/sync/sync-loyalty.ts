import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";
import type { GhlContact } from "./loyalty/types";
import {
  createCustomField,
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

const LOYALTY_FIELDS = [
  {
    key: "pointsBalance",
    name: "Points Balance",
    dataType: "NUMERICAL",
    tokens: [
      ["points", "balance"],
      ["points", "current"],
    ],
  },
  {
    key: "pointsLifetime",
    name: "Points Lifetime",
    dataType: "NUMERICAL",
    tokens: [
      ["points", "lifetime"],
      ["lifetime", "points"],
    ],
  },
  {
    key: "pointsToNext",
    name: "Points To Next",
    dataType: "NUMERICAL",
    tokens: [
      ["points", "next"],
      ["points", "to", "next"],
    ],
  },
  {
    key: "nextRewardAt",
    name: "Next Reward At",
    dataType: "NUMERICAL",
    tokens: [
      ["next", "reward", "at"],
      ["next", "reward"],
      ["reward", "next"],
    ],
  },
  {
    key: "tier",
    name: "Reward Tier",
    dataType: "TEXT",
    tokens: [
      ["reward", "tier"],
      ["loyalty", "tier"],
      ["tier"],
    ],
  },
  {
    key: "lastReward",
    name: "Last Reward At",
    dataType: "NUMERICAL",
    tokens: [
      ["last", "reward", "at"],
      ["last", "reward"],
      ["reward", "last"],
    ],
  },
] as const;

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

  let defs = await listCustomFields(locationId);
  const resolveFieldIds = () =>
    Object.fromEntries(
      LOYALTY_FIELDS.map((field) => [
        field.key,
        findFieldId(defs, field.tokens),
      ])
    ) as Record<(typeof LOYALTY_FIELDS)[number]["key"], string | null>;
  let fieldIds = resolveFieldIds();

  let missingFieldKeys = Object.entries(fieldIds)
    .filter(([, id]) => !id)
    .map(([key]) => key);
  if (missingFieldKeys.length) {
    for (const field of LOYALTY_FIELDS) {
      if (!missingFieldKeys.includes(field.key)) continue;
      try {
        await createCustomField({
          locationId,
          name: field.name,
          dataType: field.dataType,
          model: "contact",
        });
      } catch (err: any) {
        warnings.push(`Failed to create ${field.name}: ${err?.message ?? "unknown error"}`);
      }
    }
    defs = await listCustomFields(locationId);
    fieldIds = resolveFieldIds();
    missingFieldKeys = Object.entries(fieldIds)
      .filter(([, id]) => !id)
      .map(([key]) => key);
  }
  if (missingFieldKeys.length) {
    warnings.push(`Missing GHL custom fields: ${missingFieldKeys.join(", ")}`);
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
