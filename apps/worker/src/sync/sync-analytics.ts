import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

interface AnalyticsOptions {
  remoteDaily?: Record<string, { revenue: number; orders: number }>;
}

export async function syncAnalytics(
  ctx: SyncContext,
  options: AnalyticsOptions = {}
): Promise<SyncStats[]> {
  const stats: SyncStats[] = [];

  stats.push(await syncDailySummaries(ctx));
  stats.push(await syncCustomerScores(ctx));
  stats.push(await syncCustomerAcquisitions(ctx));
  stats.push(await syncCohorts(ctx));

  if (options.remoteDaily) {
    stats.push(await syncReconciliation(ctx, options.remoteDaily));
  }

  return stats;
}

async function syncDailySummaries(ctx: SyncContext): Promise<SyncStats> {
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
    const date = new Date(`${day}T00:00:00Z`);
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

async function syncCustomerScores(ctx: SyncContext): Promise<SyncStats> {
  const warnings: string[] = [];
  const groups = await prisma.order.groupBy({
    by: ["customerId"],
    where: { storeId: ctx.store.id, customerId: { not: null } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });

  for (const row of groups) {
    if (row.customerId === null || !row._max.createdAt) continue;
    const recencyDays = Math.floor(
      (Date.now() - row._max.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const r = scoreRecency(recencyDays);
    const f = scoreFrequency(row._count._all);
    const m = scoreMonetary(row._sum.total ?? 0);
    const segment = segmentLabel(r, f, m);

    await prisma.customerScore.upsert({
      where: { customerId: row.customerId },
      update: {
        storeId: ctx.store.id,
        lastOrderAt: row._max.createdAt,
        frequency: row._count._all,
        monetary: row._sum.total ?? 0,
        recencyDays,
        rfmScore: Number(`${r}${f}${m}`),
        segment,
      },
      create: {
        customerId: row.customerId,
        storeId: ctx.store.id,
        lastOrderAt: row._max.createdAt,
        frequency: row._count._all,
        monetary: row._sum.total ?? 0,
        recencyDays,
        rfmScore: Number(`${r}${f}${m}`),
        segment,
      },
    });
  }

  return {
    entity: "analytics",
    processed: groups.length,
    warnings,
    meta: { type: "customerScores" },
  };
}

async function syncCustomerAcquisitions(ctx: SyncContext): Promise<SyncStats> {
  const warnings: string[] = [];

  const orders = await prisma.order.findMany({
    where: { storeId: ctx.store.id, customerId: { not: null } },
    select: {
      id: true,
      createdAt: true,
      customerId: true,
      attribution: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const firstOrderMap = new Map<
    number,
    {
      firstOrderId: number;
      firstOrderDate: Date;
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
    }
  >();

  for (const order of orders) {
    if (!order.customerId) continue;
    if (firstOrderMap.has(order.customerId)) continue;
    firstOrderMap.set(order.customerId, {
      firstOrderId: order.id,
      firstOrderDate: order.createdAt,
      utmSource: order.attribution?.utmSource ?? null,
      utmMedium: order.attribution?.utmMedium ?? null,
      utmCampaign: order.attribution?.utmCampaign ?? null,
    });
  }

  for (const [customerId, data] of firstOrderMap.entries()) {
    await prisma.customerAcquisition.upsert({
      where: { customerId },
      update: {
        storeId: ctx.store.id,
        firstOrderId: data.firstOrderId,
        firstOrderDate: data.firstOrderDate,
        firstUtmSource: data.utmSource,
        firstUtmMedium: data.utmMedium,
        firstUtmCampaign: data.utmCampaign,
      },
      create: {
        customerId,
        storeId: ctx.store.id,
        firstOrderId: data.firstOrderId,
        firstOrderDate: data.firstOrderDate,
        firstUtmSource: data.utmSource,
        firstUtmMedium: data.utmMedium,
        firstUtmCampaign: data.utmCampaign,
      },
    });
  }

  return {
    entity: "analytics",
    processed: firstOrderMap.size,
    warnings,
    meta: { type: "customerAcquisition" },
  };
}

async function syncCohorts(ctx: SyncContext): Promise<SyncStats> {
  const warnings: string[] = [];

  const orders = await prisma.order.findMany({
    where: { storeId: ctx.store.id, customerId: { not: null } },
    select: { id: true, customerId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const firstMonth = new Map<number, Date>();
  const customersInCohort = new Map<string, Set<number>>();
  const activeByPeriod = new Map<string, Set<number>>();

  for (const order of orders) {
    if (!order.customerId) continue;
    const cohort = firstMonth.get(order.customerId) ?? startOfMonth(order.createdAt);
    if (!firstMonth.has(order.customerId)) {
      firstMonth.set(order.customerId, cohort);
      const cohortKey = cohort.toISOString();
      const cohortSet =
        customersInCohort.get(cohortKey) ?? new Set<number>();
      cohortSet.add(order.customerId);
      customersInCohort.set(cohortKey, cohortSet);
    }

    const periodMonths = monthDiff(cohort, order.createdAt);
    const key = `${cohort.toISOString()}::${periodMonths}`;
    const active = activeByPeriod.get(key) ?? new Set<number>();
    active.add(order.customerId);
    activeByPeriod.set(key, active);
  }

  for (const [key, activeSet] of activeByPeriod.entries()) {
    const [cohortISOString, periodStr] = key.split("::");
    const periodMonth = Number(periodStr);
    const cohortDate = new Date(cohortISOString);
    const cohortCustomers = customersInCohort.get(cohortISOString);
    const total = cohortCustomers?.size ?? 0;
    const active = activeSet.size;
    const retentionRate = total ? (active / total) * 100 : 0;

    await prisma.cohortMonthly.upsert({
      where: {
        storeId_cohortMonth_periodMonth: {
          storeId: ctx.store.id,
          cohortMonth: cohortDate,
          periodMonth,
        },
      },
      update: {
        customersInCohort: total,
        activeCustomers: active,
        retentionRate: Number(retentionRate.toFixed(2)),
      },
      create: {
        storeId: ctx.store.id,
        cohortMonth: cohortDate,
        periodMonth,
        customersInCohort: total,
        activeCustomers: active,
        retentionRate: Number(retentionRate.toFixed(2)),
      },
    });
  }

  return {
    entity: "analytics",
    processed: activeByPeriod.size,
    warnings,
    meta: { type: "cohorts" },
  };
}

async function syncReconciliation(
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

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function scoreRecency(days: number) {
  if (days <= 7) return 5;
  if (days <= 30) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1;
}

function scoreFrequency(freq: number) {
  if (freq >= 10) return 5;
  if (freq >= 5) return 4;
  if (freq >= 3) return 3;
  if (freq >= 2) return 2;
  return 1;
}

function scoreMonetary(amount: number) {
  if (amount >= 1000) return 5;
  if (amount >= 500) return 4;
  if (amount >= 200) return 3;
  if (amount >= 100) return 2;
  return 1;
}

function segmentLabel(r: number, f: number, m: number) {
  if (r >= 4 && f >= 4 && m >= 4) return "Champions";
  if (r >= 3 && f >= 3) return "Loyal";
  if (r >= 3 && f <= 2) return "Promising";
  return "At Risk";
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function monthDiff(from: Date, to: Date) {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  return years * 12 + months;
}
