import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

export async function syncSubscriptions(ctx: SyncContext): Promise<SyncStats> {
  const res = await ctx.client.getSubscriptions({ per_page: 100 });
  if (!res.success) {
    // Woo Subscriptions may not be installed; log warning but don't crash
    ctx.logger("Subscriptions sync skipped", { error: res.error });
    return { entity: "subscriptions", processed: 0, warnings: [res.error] };
  }

  const warnings: string[] = [];
  let processed = 0;

  for (const sub of res.data ?? []) {
    try {
      const wooId = sub.id ? String(sub.id) : null;
      const customerId = await ensureCustomer(ctx, sub);
      const product = sub.line_items?.[0];
      const productRecord = product?.product_id
        ? await prisma.product.findFirst({
            where: {
              storeId: ctx.store.id,
              wooId: String(product.product_id),
            },
          })
        : null;

      await prisma.subscription.upsert({
        where: {
          storeId_wooId: {
            storeId: ctx.store.id,
            wooId: wooId ?? `${ctx.store.id}:${sub.number ?? Date.now()}`,
          },
        },
        update: {
          customerId,
          productId: productRecord?.id ?? null,
          status: sub.status ?? "unknown",
          billingInterval: Number(sub.billing_interval ?? 1),
          billingPeriod: sub.billing_period ?? "month",
          startedAt: new Date(sub.start_date ?? sub.date_created ?? Date.now()),
          nextPaymentAt: sub.next_payment_date
            ? new Date(sub.next_payment_date)
            : null,
          recurringAmount: Number(sub.total ?? product?.subtotal ?? 0),
        },
        create: {
          storeId: ctx.store.id,
          wooId: wooId ?? `${ctx.store.id}:${sub.number ?? Date.now()}`,
          customerId,
          productId: productRecord?.id ?? null,
          status: sub.status ?? "unknown",
          billingInterval: Number(sub.billing_interval ?? 1),
          billingPeriod: sub.billing_period ?? "month",
          startedAt: new Date(sub.start_date ?? sub.date_created ?? Date.now()),
          nextPaymentAt: sub.next_payment_date
            ? new Date(sub.next_payment_date)
            : null,
          recurringAmount: Number(sub.total ?? product?.subtotal ?? 0),
        },
      });
      processed++;
    } catch (err: any) {
      warnings.push(err?.message ?? "Unknown subscription error");
    }
  }

  ctx.logger("Subscriptions synced", { processed, warnings: warnings.length });

  return { entity: "subscriptions", processed, warnings };
}

async function ensureCustomer(ctx: SyncContext, sub: any) {
  const wooCustomerId = sub.customer_id ? String(sub.customer_id) : null;

  const email =
    sub.billing?.email?.toLowerCase() ||
    `subscription-${ctx.store.id}-${sub.id}@wooanalytics.local`;

  const baseData = {
    storeId: ctx.store.id,
    email,
    firstName: sub.billing?.first_name || null,
    lastName: sub.billing?.last_name || null,
    phone: sub.billing?.phone || null,
  };

  if (wooCustomerId) {
    const record = await prisma.customer.upsert({
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
    return record.id;
  }

  const existing = await prisma.customer.findFirst({
    where: { storeId: ctx.store.id, email },
  });

  if (existing) {
    const record = await prisma.customer.update({
      where: { id: existing.id },
      data: baseData,
    });
    return record.id;
  }

  const created = await prisma.customer.create({ data: baseData });
  return created.id;
}
