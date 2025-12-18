import { prisma } from "../../db";
import type { SyncContext, SyncStats } from "../types";
import { ymd, zonedDateFromYmd } from "./helpers";

export async function syncDailySummaries(ctx: SyncContext): Promise<SyncStats> {
  const warnings: string[] = [];
  const from = new Date();
  from.setDate(from.getDate() - 120);

  const orders = await prisma.order.findMany({
    where: { storeId: ctx.store.id, createdAt: { gte: from } },
    include: { items: { select: { quantity: true } } },
    orderBy: { createdAt: "asc" },
  });

  const refunds = await prisma.refund.findMany({
    where: { storeId: ctx.store.id, createdAt: { gte: from } },
  });

  const byDay = new Map<
    string,
    {
      revenue: number;
      orders: number;
      units: number;
      customers: Set<number>;
    }
  >();

  for (const order of orders) {
    const day = ymd(order.createdAt);
    const bucket =
      byDay.get(day) ?? { revenue: 0, orders: 0, units: 0, customers: new Set() };
    bucket.revenue += order.total ?? 0;
    bucket.orders += 1;
    bucket.units += order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    if (order.customerId) bucket.customers.add(order.customerId);
    byDay.set(day, bucket);
  }

  const refundMap = new Map<string, number>();
  for (const refund of refunds) {
    const day = ymd(refund.createdAt);
    refundMap.set(day, (refundMap.get(day) ?? 0) + (refund.amount ?? 0));
  }

  for (const [day, data] of byDay.entries()) {
    const date = zonedDateFromYmd(day, false);
    const refundsAmount = refundMap.get(day) ?? 0;
    const netRevenue = data.revenue - refundsAmount;
    const aov = data.orders ? data.revenue / data.orders : 0;
    await prisma.dailySummary.upsert({
      where: {
        storeId_date: {
          storeId: ctx.store.id,
          date,
        },
      },
      update: {
        ordersCount: data.orders,
        revenue: Number(data.revenue.toFixed(2)),
        units: data.units,
        uniqueCustomers: data.customers.size,
        aov: Number(aov.toFixed(2)),
        refundsAmount,
        netRevenue,
      },
      create: {
        storeId: ctx.store.id,
        date,
        ordersCount: data.orders,
        revenue: Number(data.revenue.toFixed(2)),
        units: data.units,
        uniqueCustomers: data.customers.size,
        aov: Number(aov.toFixed(2)),
        refundsAmount,
        netRevenue,
      },
    });
  }

  return {
    entity: "analytics",
    processed: byDay.size,
    warnings,
    meta: { type: "dailySummary" },
  };
}
