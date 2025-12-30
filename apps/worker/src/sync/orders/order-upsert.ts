import { prisma } from "../../db";
import type { SyncContext } from "../types";
import { ensureCustomer } from "./order-customer";
import { syncOrderAttribution } from "./order-attribution";
import { syncOrderCoupons } from "./order-coupons";
import { syncOrderItems } from "./order-items";
import { syncOrderRefunds } from "./order-refunds";
import { normalizeDate, safeNumber } from "./order-utils";

export async function upsertOrder(ctx: SyncContext, order: any) {
  const wooId = String(order.id ?? "");
  if (!wooId) throw new Error("Missing Woo order id");

  const customer = await ensureCustomer(ctx, order);

  const createdAt = normalizeDate(order.date_created_gmt ?? order.date_created);

  const data = {
    storeId: ctx.store.id,
    wooId,
    customerId: customer?.id ?? null,
    createdAt: createdAt ?? new Date(),
    status: order.status ?? null,
    currency: order.currency ?? null,
    billingEmail:
      order.billing?.email?.toLowerCase() ||
      order.customer_email?.toLowerCase() ||
      null,
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
