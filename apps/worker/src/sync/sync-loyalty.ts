import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

const GHL_BASE =
  process.env.GHL_API_BASE?.replace(/\/$/, "") ||
  "https://services.leadconnectorhq.com";

const CUSTOMER_TAG = "customer";
const REWARD_THRESHOLDS = [150, 300, 450, 700];

type GhlFieldDef = {
  id: string;
  name?: string;
  fieldKey?: string;
};

type GhlContact = {
  id: string;
  email?: string | null;
  customFields?: Array<{ id: string; value: any }>;
};

type LoyaltyStats = {
  pointsBalance: number | null;
  pointsLifetime: number | null;
  pointsToNext: number | null;
  nextRewardAt: number | null;
  lastRewardAt: number | null;
  tier: string | null;
};

function defaultHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_PIT}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-07-28",
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { retries?: number; baseDelayMs?: number } = {}
) {
  const retries = options.retries ?? 3;
  let delayMs = options.baseDelayMs ?? 400;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt === retries) return res;
    const retryAfter = res.headers.get("retry-after");
    let waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : delayMs;
    if (!Number.isFinite(waitMs) || waitMs <= 0) waitMs = delayMs;
    await sleep(waitMs);
    delayMs *= 2;
  }
  return fetch(url, init);
}

async function handleGhlResponse(res: Response, action: string) {
  if (res.status === 429) {
    throw new Error("GHL rate limited (429)");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${action} failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function listCustomFields(locationId: string): Promise<GhlFieldDef[]> {
  const res = await fetchWithRetry(`${GHL_BASE}/locations/${locationId}/customFields`, {
    method: "GET",
    headers: defaultHeaders(),
  });
  const json = (await handleGhlResponse(res, "GHL list custom fields")) as any;
  const items = Array.isArray(json?.customFields) ? json.customFields : [];
  return items
    .map((item: any) => {
      if (!item?.id) return null;
      return {
        id: String(item.id),
        name: item.name,
        fieldKey: item.fieldKey || item.key,
      } as GhlFieldDef;
    })
    .filter(Boolean) as GhlFieldDef[];
}

async function searchContactsByQuery(params: {
  locationId: string;
  query: string;
  page?: number;
  pageLimit?: number;
}) {
  const body: any = {
    locationId: params.locationId,
    page: params.page ?? 1,
    pageLimit: Math.min(Math.max(params.pageLimit || 50, 1), 200),
    query: params.query || "",
  };

  const res = await fetchWithRetry(`${GHL_BASE}/contacts/search`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });

  const json = (await handleGhlResponse(res, "GHL search contacts")) as any;
  const contacts = Array.isArray(json?.contacts) ? (json.contacts as GhlContact[]) : [];
  return {
    contacts: contacts.filter((c) => c && (c as any).id),
    total: json?.total ?? contacts.length,
    nextPage: contacts.length ? (body.page ?? 1) + 1 : null,
  };
}

async function updateContactCustomFields(contactId: string, customFields: Array<{ id: string; value: any }>) {
  const res = await fetchWithRetry(`${GHL_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: defaultHeaders(),
    body: JSON.stringify({ customFields }),
  });
  return handleGhlResponse(res, "GHL update contact");
}

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTokens(text: string, tokens: string[]) {
  return tokens.every((token) => text.includes(token));
}

function findFieldId(defs: GhlFieldDef[], tokenSets: string[][]) {
  for (const tokens of tokenSets) {
    const match = defs.find((def) => {
      const text = `${normalizeText(def.name)} ${normalizeText(def.fieldKey)}`;
      return matchesTokens(text, tokens);
    });
    if (match) return match.id;
  }
  return null;
}

function extractWooId(customFields: Array<{ id: string; value: any }>, defs: GhlFieldDef[]) {
  const wooIdFieldId = findFieldId(defs, [
    ["woo", "customer", "id"],
    ["woocommerce", "customer", "id"],
    ["woo", "id"],
    ["woocommerce", "id"],
  ]);
  if (!wooIdFieldId) return null;
  const value = customFields.find((field) => String(field.id) === wooIdFieldId)?.value;
  if (value == null || value === "") return null;
  const asString = String(value).trim();
  return asString ? asString : null;
}

function buildLoyaltyStats(totalSpend: number | null | undefined): LoyaltyStats {
  if (totalSpend == null || Number.isNaN(totalSpend)) {
    return {
      pointsBalance: null,
      pointsLifetime: null,
      pointsToNext: null,
      nextRewardAt: null,
      lastRewardAt: null,
      tier: null,
    };
  }

  const points = Math.floor(totalSpend);
  let lastRewardAt: number | null = null;
  let nextRewardAt: number | null = null;

  for (const threshold of REWARD_THRESHOLDS) {
    if (points >= threshold) {
      lastRewardAt = threshold;
    } else {
      nextRewardAt = threshold;
      break;
    }
  }

  return {
    pointsBalance: points,
    pointsLifetime: points,
    pointsToNext: nextRewardAt != null ? Math.max(nextRewardAt - points, 0) : null,
    nextRewardAt,
    lastRewardAt,
    tier: lastRewardAt ? `reward_unlocked_${lastRewardAt}` : null,
  };
}

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
    const loyalty = buildLoyaltyStats(totalSpend);

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
