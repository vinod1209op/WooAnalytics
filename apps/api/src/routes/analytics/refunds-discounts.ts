import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerRefundsDiscountsRoute(router: Router) {
  router.get("/refunds-discounts", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);

      const [refunds, orders] = await Promise.all([
        prisma.refund.findMany({
          where: { storeId, createdAt: { gte: fromDate, lte: toDate } },
          select: { amount: true, createdAt: true },
        }),
        prisma.order.findMany({
          where: buildOrderWhere(req, fromDate, toDate),
          select: { createdAt: true, discountTotal: true },
        }),
      ]);

      const buckets = new Map<
        string,
        {
          refunds: number;
          discounts: number;
        }
      >();

      for (const refund of refunds) {
        const day = ymd(refund.createdAt);
        const bucket = buckets.get(day) ?? { refunds: 0, discounts: 0 };
        bucket.refunds += refund.amount ?? 0;
        buckets.set(day, bucket);
      }

      for (const order of orders) {
        const day = ymd(order.createdAt);
        const bucket = buckets.get(day) ?? { refunds: 0, discounts: 0 };
        bucket.discounts += order.discountTotal ?? 0;
        buckets.set(day, bucket);
      }

      const points = buildContinuousSeries(fromDate, toDate, buckets, (day, bucket) => {
        const refundsTotal = bucket?.refunds ?? 0;
        const discountsTotal = bucket?.discounts ?? 0;
        const totalImpact = refundsTotal + discountsTotal;

        return {
          date: day,
          refunds: round2(refundsTotal),
          discounts: round2(discountsTotal),
          totalImpact: round2(totalImpact),
        };
      });

      return res.json({ points });
    } catch (err: any) {
      console.error("GET /analytics/refunds-discounts error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
