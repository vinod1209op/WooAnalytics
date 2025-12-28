import type { Order } from "@prisma/client";
import { prisma } from "../../db";
import type { SyncContext } from "../types";

export async function syncOrderRefunds(ctx: SyncContext, order: Order, wooOrder: any) {
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
        createdAt: refund.date_created ? new Date(refund.date_created) : new Date(),
      },
    });
  }
}
