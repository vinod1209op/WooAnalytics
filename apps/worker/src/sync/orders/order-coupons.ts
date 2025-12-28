import type { Order } from "@prisma/client";
import { prisma } from "../../db";
import type { SyncContext } from "../types";
import { safeNumber } from "./order-utils";

export async function syncOrderCoupons(
  ctx: SyncContext,
  order: Order,
  coupons: any[]
) {
  await prisma.orderCoupon.deleteMany({ where: { orderId: order.id } });

  for (const coupon of coupons) {
    const code = coupon.code ?? "coupon";
    const amount = safeNumber(coupon.discount ?? coupon.amount) ?? 0;

    const couponRecord = await prisma.coupon.upsert({
      where: {
        storeId_code: {
          storeId: ctx.store.id,
          code,
        },
      },
      update: {
        amount,
        discountType: coupon.type ?? null,
      },
      create: {
        storeId: ctx.store.id,
        code,
        amount,
        discountType: coupon.type ?? null,
      },
    });

    await prisma.orderCoupon.create({
      data: {
        orderId: order.id,
        couponId: couponRecord.id,
        discountApplied: amount,
        revenueImpact: amount,
      },
    });
  }
}
