import { prisma } from "../../db";
import type { SyncContext, SyncStats } from "../types";

export async function syncCustomerAcquisitions(ctx: SyncContext): Promise<SyncStats> {
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
