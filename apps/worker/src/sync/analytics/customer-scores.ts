import { prisma } from "../../db";
import type { SyncContext, SyncStats } from "../types";
import { scoreFrequency, scoreMonetary, scoreRecency, segmentLabel } from "./scoring";

export async function syncCustomerScores(ctx: SyncContext): Promise<SyncStats> {
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
