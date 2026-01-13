import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildOrderWhere, parseDateQuery, round2 } from "./utils";

const DEFAULT_LIMIT = 200;
const DIRECT_LABEL = "Direct";
const MEDIUM_NONE_LABEL = "None";
const DIRECT_TOKENS = new Set(["(direct)", "direct"]);
const NONE_TOKENS = new Set([
  "(none)",
  "none",
  "(not set)",
  "not set",
  "(not provided)",
  "not provided",
]);

type NormalizedValue = { key: string; label: string };

const SOURCE_MAP: { match: RegExp; label: string; key: string }[] = [
  { match: /^mcrdse[-_.]?movement/, label: "MCRDSE Movement", key: "mcrdse_movement" },
  { match: /facebook|m\.facebook\.com|l\.facebook\.com|^fb$/i, label: "Facebook", key: "facebook" },
  { match: /instagram\.com|l\.instagram\.com|^ig$/i, label: "Instagram", key: "instagram" },
  { match: /linktr\.ee/i, label: "Linktree", key: "linktree" },
  { match: /klaviyo/i, label: "Klaviyo", key: "klaviyo" },
  { match: /leadconnectorhq\.com|msgsndr\.com/i, label: "LeadConnector", key: "leadconnector" },
  { match: /com\.google\.android\.gm|gmail/i, label: "Gmail", key: "gmail" },
  { match: /google/i, label: "Google", key: "google" },
  { match: /duckduckgo/i, label: "DuckDuckGo", key: "duckduckgo" },
  { match: /search\.yahoo\.com/i, label: "Yahoo", key: "yahoo" },
  { match: /search\.brave\.com|brave\.com/i, label: "Brave", key: "brave" },
  { match: /bing\.com/i, label: "Bing", key: "bing" },
  { match: /telegram/i, label: "Telegram", key: "telegram" },
  { match: /mcrdse\.ca/i, label: "MCRDSE", key: "mcrdse" },
  { match: /tagassistant\.google\.com/i, label: "Google Tag Assistant", key: "google_tagassistant" },
  { match: /dnserrorassist\.att\.net/i, label: "AT&T DNS Assist", key: "att_dns_assist" },
  { match: /my\.10web\.io/i, label: "10Web", key: "10web" },
  { match: /remotive\.com/i, label: "Remotive", key: "remotive" },
];

const MEDIUM_MAP: { match: RegExp; label: string; key: string }[] = [
  { match: /ghl.*email/i, label: "GHL Email", key: "ghl_email" },
  { match: /email/i, label: "Email", key: "email" },
  { match: /quiz[-_\s]?submission/i, label: "Quiz Submission", key: "quiz_submission" },
  { match: /referral/i, label: "Referral", key: "referral" },
  { match: /organic/i, label: "Organic", key: "organic" },
  { match: /cpc|paid/i, label: "Paid", key: "paid" },
  { match: /campaign/i, label: "Campaign", key: "campaign" },
  { match: /flow/i, label: "Flow", key: "flow" },
  { match: /support/i, label: "Support", key: "support" },
  { match: /sms/i, label: "SMS", key: "sms" },
  { match: /website/i, label: "Website", key: "website" },
];

function normalizeSource(value: string | null | undefined): NormalizedValue {
  const trimmed = value?.trim();
  if (!trimmed) return { key: "direct", label: DIRECT_LABEL };
  const lower = trimmed.toLowerCase();
  if (DIRECT_TOKENS.has(lower)) return { key: "direct", label: DIRECT_LABEL };
  if (NONE_TOKENS.has(lower)) return { key: "direct", label: DIRECT_LABEL };
  const mapped = SOURCE_MAP.find((entry) => entry.match.test(trimmed));
  if (mapped) return { key: mapped.key, label: mapped.label };
  if (trimmed.includes(".")) {
    return { key: lower, label: lower };
  }
  const label = trimmed
    .toLowerCase()
    .replace(/(^|[\s-_])([a-z])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
  return { key: lower, label };
}

function normalizeMedium(value: string | null | undefined): NormalizedValue {
  const trimmed = value?.trim();
  if (!trimmed) return { key: "none", label: MEDIUM_NONE_LABEL };
  const lower = trimmed.toLowerCase();
  if (NONE_TOKENS.has(lower)) return { key: "none", label: MEDIUM_NONE_LABEL };
  const mapped = MEDIUM_MAP.find((entry) => entry.match.test(trimmed));
  if (mapped) return { key: mapped.key, label: mapped.label };
  const label = trimmed
    .toLowerCase()
    .replace(/(^|[\s-_])([a-z])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
  return { key: lower, label };
}

export function registerUtmOrdersRoute(router: Router) {
  router.get("/utm-orders", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);
      const baseWhere = buildOrderWhere(req, fromDate, toDate);
      const limit = Math.max(
        1,
        Math.min(200, Number(req.query.limit) || DEFAULT_LIMIT)
      );

      const orders = await prisma.order.findMany({
        where: baseWhere,
        select: {
          id: true,
          customerId: true,
          billingEmail: true,
          attribution: {
            select: {
              utmSource: true,
              utmMedium: true,
            },
          },
        },
      });

      const buckets = new Map<
        string,
        {
          source: string;
          medium: string;
          orders: Set<number>;
          customers: Set<string>;
        }
      >();
      const movementOrders = new Set<number>();
      const movementCustomers = new Set<string>();

      for (const order of orders) {
        const source = normalizeSource(order.attribution?.utmSource);
        const medium = normalizeMedium(order.attribution?.utmMedium);
        const key = `${source.key}::${medium.key}`;
        const bucket =
          buckets.get(key) ??
          {
            source: source.label,
            medium: medium.label,
            orders: new Set<number>(),
            customers: new Set<string>(),
          };

        bucket.orders.add(order.id);
        if (source.key === "mcrdse_movement") {
          movementOrders.add(order.id);
        }

        const customerId = order.customerId ?? null;
        const customerKey =
          customerId != null
            ? `id:${customerId}`
            : order.billingEmail?.trim().toLowerCase()
            ? `email:${order.billingEmail.trim().toLowerCase()}`
            : null;
        if (customerKey) {
          bucket.customers.add(customerKey);
          if (source.key === "mcrdse_movement") {
            movementCustomers.add(customerKey);
          }
        }

        buckets.set(key, bucket);
      }

      const totalOrders = orders.length;
      const movementSummary = {
        orders: movementOrders.size,
        customers: movementCustomers.size,
        share: totalOrders
          ? round2((movementOrders.size / totalOrders) * 100)
          : 0,
      };

      const points = Array.from(buckets.values())
        .map((bucket) => ({
          source: bucket.source,
          medium: bucket.medium,
          orders: bucket.orders.size,
          customers: bucket.customers.size,
          share: totalOrders
            ? round2((bucket.orders.size / totalOrders) * 100)
            : 0,
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, limit);

      return res.json({ totalOrders, movement: movementSummary, points });
    } catch (err: any) {
      console.error("GET /analytics/utm-orders error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
