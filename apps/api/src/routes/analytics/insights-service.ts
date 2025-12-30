import { prisma } from "../../prisma";
import { parseDateRange, round2, ymd } from "./utils";

const endOfToday = () => {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return to;
};

const startOfDaysAgo = (days: number, end: Date) => {
  const from = new Date(end);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return from;
};

export async function getPeakRevenueDay(storeId: string, from?: string, to?: string) {
  const { fromDate, toDate } = parseDateRange(from, to);
  const peak = await prisma.dailySummary.findFirst({
    where: { storeId, date: { gte: fromDate, lte: toDate } },
    orderBy: { revenue: "desc" },
    select: { date: true, revenue: true, ordersCount: true, aov: true }
  });

  return peak
    ? {
        date: ymd(peak.date),
        revenue: round2(peak.revenue),
        orders: peak.ordersCount,
        aov: round2(peak.aov)
      }
    : null;
}

export async function getAnomalies(storeId: string) {
  const toDate = endOfToday();
  const fromDate = startOfDaysAgo(60, toDate);

  const rows = await prisma.dailySummary.findMany({
    where: { storeId, date: { gte: fromDate, lte: toDate } },
    select: { date: true, revenue: true, ordersCount: true }
  });
  if (!rows.length) return [];

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdev = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);

  const revs = rows.map((r) => r.revenue);
  const ords = rows.map((r) => r.ordersCount);
  const revMean = mean(revs);
  const ordMean = mean(ords);
  const revStd = stdev(revs, revMean);
  const ordStd = stdev(ords, ordMean);

  return rows
    .map((r) => {
      const revZ = revStd ? (r.revenue - revMean) / revStd : 0;
      const ordZ = ordStd ? (r.ordersCount - ordMean) / ordStd : 0;
      const isAnomaly = Math.abs(revZ) >= 2 || Math.abs(ordZ) >= 2;
      return isAnomaly
        ? {
            date: ymd(r.date),
            revenue: round2(r.revenue),
            orders: r.ordersCount,
            revenueZ: round2(revZ),
            ordersZ: round2(ordZ)
          }
        : null;
    })
    .filter(Boolean)
    .slice(-10);
}

export async function getRetentionHighlights(storeId: string) {
  const cohorts = await prisma.cohortMonthly.findMany({
    where: { storeId, customersInCohort: { gt: 0 } },
    select: { cohortMonth: true, periodMonth: true, retentionRate: true, customersInCohort: true },
    orderBy: [{ retentionRate: "desc" }, { cohortMonth: "desc" }]
  });

  if (!cohorts.length) return { best: null, worst: null };

  const best = cohorts[0];
  const worst = cohorts[cohorts.length - 1];

  return {
    best: {
      cohortMonth: ymd(best.cohortMonth),
      periodMonth: best.periodMonth,
      retentionRate: round2(best.retentionRate),
      customersInCohort: best.customersInCohort
    },
    worst: {
      cohortMonth: ymd(worst.cohortMonth),
      periodMonth: worst.periodMonth,
      retentionRate: round2(worst.retentionRate),
      customersInCohort: worst.customersInCohort
    }
  };
}

export async function getRepeatPurchaseRates(storeId: string, windows: number[]) {
  const calc = async (days: number) => {
    const to = endOfToday();
    const from = startOfDaysAgo(days, to);

    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      _count: { id: true },
      where: {
        storeId,
        customerId: { not: null },
        createdAt: { gte: from, lte: to }
      }
    });

    const totalCustomers = groups.length;
    const repeatCustomers = groups.filter((g) => g._count.id > 1).length;
    const rate = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    return {
      days,
      from: ymd(from),
      to: ymd(to),
      totalCustomers,
      repeatCustomers,
      rate: round2(rate)
    };
  };

  const results = await Promise.all(windows.map((window) => calc(window)));
  return results.reduce<Record<string, any>>((acc, item) => {
    acc[`last${item.days}`] = item;
    return acc;
  }, {});
}

export async function getHighValueOrders(storeId: string, days: number, limit: number) {
  const to = endOfToday();
  const from = startOfDaysAgo(days, to);

  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: from, lte: to } },
    select: {
      id: true,
      createdAt: true,
      total: true,
      status: true,
      customer: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { total: "desc" },
    take: limit
  });

  const mapped = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    total: round2(o.total),
    status: o.status,
    customer: o.customer
      ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim() || o.customer.email
      : "Guest"
  }));

  return { orders: mapped, from: ymd(from), to: ymd(to) };
}

export async function getAgingOrders(storeId: string, days: number, limit: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["pending", "processing"] },
      createdAt: { lte: cutoff }
    },
    select: {
      id: true,
      createdAt: true,
      total: true,
      status: true,
      customer: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  const mapped = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    total: round2(o.total),
    status: o.status,
    customer: o.customer
      ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim() || o.customer.email
      : "Guest",
    ageDays: Math.ceil((Date.now() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }));

  return { orders: mapped, cutoff: ymd(cutoff) };
}
