import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildLeadCouponStats } from "../customers/lead-coupon-stats";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerLeadCouponsRoute(router: Router) {
  router.get("/lead-coupons", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const { fromDate, toDate } = parseDateQuery(req);
      const baseWhere = buildOrderWhere(req, fromDate, toDate);

      if (req.query.type === "coupon") {
        delete baseWhere.coupons;
      }

      const [orders, leadOrderCoupons, leadCoupons, leadStats] = await Promise.all([
        prisma.order.findMany({
          where: baseWhere,
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.orderCoupon.findMany({
          where: {
            coupon: { code: { startsWith: "lead-" } },
            order: baseWhere,
          },
          select: {
            orderId: true,
            order: { select: { createdAt: true } },
            coupon: { select: { code: true } },
          },
        }),
        prisma.coupon.findMany({
          where: {
            storeId,
            code: { startsWith: "lead-" },
            createdAt: { gte: fromDate, lte: toDate },
          },
          select: { code: true, createdAt: true },
        }),
        buildLeadCouponStats({ storeId }),
      ]);

      const totalBuckets = new Map<string, number>();
      const leadOrderBuckets = new Map<string, Set<number>>();
      const redeemedBuckets = new Map<string, Set<string>>();
      const createdBuckets = new Map<string, Set<string>>();

      for (const order of orders) {
        const day = ymd(order.createdAt);
        totalBuckets.set(day, (totalBuckets.get(day) ?? 0) + 1);
      }
      for (const entry of leadOrderCoupons) {
        const createdAt = entry.order?.createdAt;
        if (!createdAt) continue;
        const day = ymd(createdAt);
        const orderSet = leadOrderBuckets.get(day) ?? new Set<number>();
        orderSet.add(entry.orderId);
        leadOrderBuckets.set(day, orderSet);

        const couponCode = entry.coupon?.code;
        if (couponCode) {
          const redeemedSet = redeemedBuckets.get(day) ?? new Set<string>();
          redeemedSet.add(couponCode);
          redeemedBuckets.set(day, redeemedSet);
        }
      }
      for (const coupon of leadCoupons) {
        if (!coupon.createdAt) continue;
        const day = ymd(coupon.createdAt);
        const createdSet = createdBuckets.get(day) ?? new Set<string>();
        createdSet.add(coupon.code);
        createdBuckets.set(day, createdSet);
      }

      const points = buildContinuousSeries(fromDate, toDate, totalBuckets, (day) => {
        const totalOrders = totalBuckets.get(day) ?? 0;
        const leadOrdersCount = leadOrderBuckets.get(day)?.size ?? 0;
        const redeemedCount = redeemedBuckets.get(day)?.size ?? 0;
        const createdCount = createdBuckets.get(day)?.size ?? 0;
        return {
          date: day,
          totalOrders,
          leadOrders: leadOrdersCount,
          redemptionRate: createdCount
            ? round2((redeemedCount / createdCount) * 100)
            : 0,
        };
      });

      const totalOrdersCount = orders.length;
      const leadOrdersCount = Array.from(leadOrderBuckets.values()).reduce(
        (sum, set) => sum + set.size,
        0
      );
      const redeemedCount = Array.from(redeemedBuckets.values()).reduce(
        (sum, set) => sum + set.size,
        0
      );
      const createdCount = Array.from(createdBuckets.values()).reduce(
        (sum, set) => sum + set.size,
        0
      );

      return res.json({
        summary: {
          generated: leadStats?.generated ?? 0,
          redeemed: leadStats?.redeemed ?? 0,
          redeemedUses: leadStats?.redeemedUses ?? 0,
          ordersUsing: leadOrdersCount,
          redemptionRate: createdCount
            ? round2((redeemedCount / createdCount) * 100)
            : null,
        },
        points,
      });
    } catch (err: any) {
      console.error("GET /analytics/lead-coupons error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
