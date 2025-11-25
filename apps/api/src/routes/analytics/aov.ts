import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerAovRoute(router: Router) {
  router.get("/aov", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);

      const orders = await prisma.order.findMany({
        where: buildOrderWhere(req, fromDate, toDate),
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "asc" },
      });

      const buckets = new Map<
        string,
        {
          revenue: number;
          orders: number;
        }
      >();

      for (const order of orders) {
        const day = ymd(order.createdAt);
        const bucket = buckets.get(day) ?? { revenue: 0, orders: 0 };
        bucket.revenue += order.total ?? 0;
        bucket.orders += 1;
        buckets.set(day, bucket);
      }

      const points = buildContinuousSeries(fromDate, toDate, buckets, (day, bucket) => {
        const revenue = bucket?.revenue ?? 0;
        const orderCount = bucket?.orders ?? 0;
        const aov = orderCount ? revenue / orderCount : 0;
        return {
          date: day,
          aov: round2(aov),
          revenue: round2(revenue),
          orders: orderCount,
        };
      });

      return res.json({ points });
    } catch (err: any) {
      console.error("GET /analytics/aov error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
