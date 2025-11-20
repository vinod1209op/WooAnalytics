import type { Customer, Order } from "@prisma/client";
import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

interface SyncOrdersOptions {
  since?: Date;
  full?: boolean;
}

export async function syncOrders(
  ctx: SyncContext,
  options: SyncOrdersOptions = {}
): Promise<SyncStats> {
  const params: Record<string, unknown> = {
    per_page: 100,
    status: "any",
  };

  if (options.since && !options.full) {
    params.after = options.since.toISOString();
  }

  const res = await ctx.client.getOrders(params);

  if (!res.success) {
    throw new Error(`Failed to load orders: ${res.error}`);
  }

  const warnings: string[] = [];
  let processed = 0;
  const remoteDaily = new Map<
    string,
    { revenue: number; orders: number }
  >();

  for (const order of res.data ?? []) {
    try {
      await upsertOrder(ctx, order);
      trackRemote(remoteDaily, order);
      processed++;
    } catch (err: any) {
      warnings.push(
        `Order ${order.id ?? "unknown"}: ${err?.message ?? "Unknown error"}`
      );
    }
  }

  ctx.logger("Orders synced", { processed, warnings: warnings.length });

  return {
    entity: "orders",
    processed,
    warnings,
    meta: {
      remoteDaily: Object.fromEntries(remoteDaily.entries()),
    },
  };
}

async function upsertOrder(ctx: SyncContext, order: any) {
  const wooId = String(order.id ?? "");
  if (!wooId) throw new Error("Missing Woo order id");

  const customer = await ensureCustomer(ctx, order);

  const createdAt = normalizeDate(
    order.date_created_gmt ?? order.date_created
  );

  const data = {
    storeId: ctx.store.id,
    wooId,
    customerId: customer?.id ?? null,
    createdAt: createdAt ?? new Date(),
    status: order.status ?? null,
    currency: order.currency ?? null,
    total: safeNumber(order.total) ?? 0,
    subtotal: safeNumber(order.subtotal) ?? safeNumber(order.total),
    discountTotal: safeNumber(order.discount_total) ?? null,
    shippingTotal: safeNumber(order.shipping_total) ?? null,
    taxTotal: safeNumber(order.total_tax) ?? null,
    paymentMethod: order.payment_method ?? null,
    shippingCountry: order.shipping?.country ?? null,
    shippingCity: order.shipping?.city ?? null,
  };

  const record = await prisma.order.upsert({
    where: {
      storeId_wooId: {
        storeId: ctx.store.id,
        wooId,
      },
    },
    update: data,
    create: data,
  });

  await syncOrderItems(ctx, record, order.line_items ?? []);
  await syncOrderCoupons(ctx, record, order.coupon_lines ?? []);
  await syncOrderRefunds(ctx, record, order);
  await syncOrderAttribution(ctx, record, order);
}

async function ensureCustomer(
  ctx: SyncContext,
  order: any
): Promise<Customer | null> {
  const wooCustomerId = order.customer_id
    ? String(order.customer_id)
    : null;
  const email =
    order.billing?.email?.toLowerCase() ||
    order.customer_email?.toLowerCase() ||
    `order-${ctx.store.id}-${order.id}@wooanalytics.local`;

  const baseData = {
    storeId: ctx.store.id,
    email,
    firstName: order.billing?.first_name || null,
    lastName: order.billing?.last_name || null,
    phone: order.billing?.phone || null,
    lastActiveAt: normalizeDate(
      order.date_modified_gmt ?? order.date_completed ?? order.date_created
    ),
  };

  if (wooCustomerId) {
    return prisma.customer.upsert({
      where: {
        storeId_wooId: {
          storeId: ctx.store.id,
          wooId: wooCustomerId,
        },
      },
      update: baseData,
      create: {
        ...baseData,
        wooId: wooCustomerId,
      },
    });
  }

  const existing = await prisma.customer.findFirst({
    where: {
      storeId: ctx.store.id,
      email,
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return prisma.customer.create({
    data: baseData,
  });
}

async function syncOrderItems(ctx: SyncContext, order: Order, items: any[]) {
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });

  for (const item of items) {
    const product =
      item.product_id &&
      (await prisma.product.findFirst({
        where: {
          storeId: ctx.store.id,
          wooId: String(item.product_id),
        },
      }));

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product?.id ?? null,
        name: item.name ?? "Line Item",
        sku: item.sku || product?.sku || null,
        quantity: Number(item.quantity ?? 1),
        unitPrice: safeNumber(item.price) ?? null,
        lineSubtotal: safeNumber(item.subtotal) ?? null,
        lineTotal: safeNumber(item.total) ?? null,
        taxTotal: safeNumber(item.total_tax) ?? null,
      },
    });
  }
}

async function syncOrderCoupons(
  ctx: SyncContext,
  order: Order,
  coupons: any[]
) {
  await prisma.orderCoupon.deleteMany({ where: { orderId: order.id } });

  for (const coupon of coupons) {
    const code = coupon.code ?? "coupon";
    const amount = safeNumber(coupon.discount ?? coupon.amount) ?? 0;

    const couponRecord = await prisma.coupon.upsert({
      where: {
        storeId_code: {
          storeId: ctx.store.id,
          code,
        },
      },
      update: {
        amount,
        discountType: coupon.type ?? null,
      },
      create: {
        storeId: ctx.store.id,
        code,
        amount,
        discountType: coupon.type ?? null,
      },
    });

    await prisma.orderCoupon.create({
      data: {
        orderId: order.id,
        couponId: couponRecord.id,
        discountApplied: amount,
        revenueImpact: amount,
      },
    });
  }
}

async function syncOrderRefunds(ctx: SyncContext, order: Order, wooOrder: any) {
  const res = await ctx.client.getOrderRefunds(wooOrder.id ?? order.wooId ?? "");
  if (!res.success) {
    ctx.logger("Refund fetch failed", {
      orderId: order.id,
      error: res.error,
    });
    return;
  }

  await prisma.refund.deleteMany({ where: { orderId: order.id } });

  for (const refund of res.data ?? []) {
    await prisma.refund.create({
      data: {
        storeId: ctx.store.id,
        wooId: refund.id ? String(refund.id) : null,
        orderId: order.id,
        amount: Number(refund.amount ?? 0),
        reason: refund.reason ?? null,
        createdAt: refund.date_created
          ? new Date(refund.date_created)
          : new Date(),
      },
    });
  }
}

async function syncOrderAttribution(
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

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(Number(date)) ? undefined : date;
}

function safeNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function trackRemote(
  map: Map<string, { revenue: number; orders: number }>,
  order: any
) {
  const created =
    order.date_created_gmt ?? order.date_created ?? new Date().toISOString();
  const day = created.slice(0, 10);
  const bucket = map.get(day) ?? { revenue: 0, orders: 0 };
  bucket.revenue += Number(order.total ?? 0);
  bucket.orders += 1;
  map.set(day, bucket);
}
