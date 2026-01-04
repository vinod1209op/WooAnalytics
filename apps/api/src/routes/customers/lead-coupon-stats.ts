import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
export type LeadCouponStats = {
  generated: number;
  redeemed: number;
  redeemedUses: number;
  ordersUsing: number;
  redemptionRate: number | null;
};

export async function buildLeadCouponStats(params: {
  storeId?: string;
}): Promise<LeadCouponStats | null> {
  if (!params.storeId) return null;
  const codeFilter = { startsWith: "lead-" };

  const [generated, redeemed, redeemedUses, ordersUsing] = await Promise.all([
    prisma.coupon.count({
      where: { storeId: params.storeId, code: codeFilter },
    }),
    prisma.coupon.count({
      where: {
        storeId: params.storeId,
        code: codeFilter,
        usageCount: { gt: 0 },
      },
    }),
    prisma.coupon.aggregate({
      where: { storeId: params.storeId, code: codeFilter },
      _sum: { usageCount: true },
    }),
    prisma.orderCoupon.count({
      where: { coupon: { storeId: params.storeId, code: codeFilter } },
    }),
  ]);

  const totalUses = redeemedUses._sum.usageCount ?? 0;
  const redemptionRate = generated > 0 ? round2((redeemed / generated) * 100) : null;
  return {
    generated,
    redeemed,
    redeemedUses: totalUses,
    ordersUsing,
    redemptionRate,
  };
}
