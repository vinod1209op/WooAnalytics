import { prisma } from "../../db";
import type { SyncContext, SyncStats } from "../types";
import { monthDiff, startOfMonth } from "./helpers";

export async function syncCohorts(ctx: SyncContext): Promise<SyncStats> {
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
      const cohortSet = customersInCohort.get(cohortKey) ?? new Set<number>();
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
