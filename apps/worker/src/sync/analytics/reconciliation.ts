import { prisma } from "../../db";
import type { SyncContext, SyncStats } from "../types";
import { ymd } from "./helpers";

export async function syncReconciliation(
  ctx: SyncContext,
  remoteDaily: Record<string, { revenue: number; orders: number }>
): Promise<SyncStats> {
  const warnings: string[] = [];
  const days = Object.keys(remoteDaily);
  if (!days.length) {
    return {
      entity: "analytics",
      processed: 0,
      warnings,
      meta: { type: "reconciliation" },
    };
  }

  const fromDate = new Date(`${days[0]}T00:00:00Z`);
  const toDate = new Date(`${days[days.length - 1]}T23:59:59Z`);

  const orders = await prisma.order.findMany({
    where: {
      storeId: ctx.store.id,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: { createdAt: true, total: true },
  });

  const dbMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const day = ymd(order.createdAt);
    const bucket = dbMap.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue += order.total ?? 0;
    bucket.orders += 1;
    dbMap.set(day, bucket);
  }

  let processed = 0;

  for (const day of days) {
    const db = dbMap.get(day) ?? { revenue: 0, orders: 0 };
    const woo = remoteDaily[day];
    const diff = woo.revenue - db.revenue;

    await prisma.reconciliation.upsert({
      where: {
        storeId_date: {
          storeId: ctx.store.id,
          date: new Date(`${day}T00:00:00Z`),
        },
      },
      update: {
        wooOrders: woo.orders,
        wooRevenue: woo.revenue,
        dbOrders: db.orders,
        dbRevenue: db.revenue,
        diffRevenue: diff,
        status: Math.abs(diff) < 0.01 ? "ok" : "mismatch",
        note: Math.abs(diff) < 0.01 ? null : "Amounts differ",
      },
      create: {
        storeId: ctx.store.id,
        date: new Date(`${day}T00:00:00Z`),
        wooOrders: woo.orders,
        wooRevenue: woo.revenue,
        dbOrders: db.orders,
        dbRevenue: db.revenue,
        diffRevenue: diff,
        status: Math.abs(diff) < 0.01 ? "ok" : "mismatch",
        note: Math.abs(diff) < 0.01 ? null : "Amounts differ",
      },
    });
    processed++;
  }

  return {
    entity: "analytics",
    processed,
    warnings,
    meta: { type: "reconciliation" },
  };
}
