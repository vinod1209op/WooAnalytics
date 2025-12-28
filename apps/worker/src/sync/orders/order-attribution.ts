import type { Order } from "@prisma/client";
import { prisma } from "../../db";
import type { SyncContext } from "../types";

export async function syncOrderAttribution(
  ctx: SyncContext,
  order: Order,
  wooOrder: any
) {
  const meta = Array.isArray(wooOrder.meta_data) ? wooOrder.meta_data : [];
  const utm = extractUtm(meta);

  await prisma.orderAttribution.upsert({
    where: { orderId: order.id },
    update: utm,
    create: {
      orderId: order.id,
      ...utm,
    },
  });
}

function extractUtm(meta: any[]) {
  const lookup = new Map<string, string>();
  for (const entry of meta) {
    if (!entry?.key) continue;
    lookup.set(String(entry.key).toLowerCase(), String(entry.value ?? ""));
  }

  const source =
    lookup.get("utm_source") ??
    lookup.get("_utm_source") ??
    lookup.get("_wc_order_attribution_utm_source");
  const medium =
    lookup.get("utm_medium") ??
    lookup.get("_utm_medium") ??
    lookup.get("_wc_order_attribution_utm_medium");
  const campaign =
    lookup.get("utm_campaign") ??
    lookup.get("_utm_campaign") ??
    lookup.get("_wc_order_attribution_utm_campaign");
  const term =
    lookup.get("utm_term") ??
    lookup.get("_utm_term") ??
    lookup.get("_wc_order_attribution_utm_term");
  const content =
    lookup.get("utm_content") ??
    lookup.get("_utm_content") ??
    lookup.get("_wc_order_attribution_utm_content");

  return {
    utmSource: source ?? null,
    utmMedium: medium ?? null,
    utmCampaign: campaign ?? null,
    utmTerm: term ?? null,
    utmContent: content ?? null,
  };
}
