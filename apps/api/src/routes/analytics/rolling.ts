import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerRollingRoute(router: Router) {
  router.get("/rolling", async (req: Request, res: Response) => {
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

      const buckets = new Map<string, { revenue: number; orders: number }>();

      for (const order of orders) {
        const day = ymd(order.createdAt);
        const bucket = buckets.get(day) ?? { revenue: 0, orders: 0 };
        bucket.revenue += order.total ?? 0;
        bucket.orders += 1;
        buckets.set(day, bucket);
      }

      const daily = buildContinuousSeries(fromDate, toDate, buckets, (day, bucket) => ({
        date: day,
        revenue: bucket?.revenue ?? 0,
        orders: bucket?.orders ?? 0,
      }));

      const points = daily.map((point, idx) => {
        const start = Math.max(0, idx - 6);
        const window = daily.slice(start, idx + 1);
        const windowSize = window.length || 1;
        const revenueSum = window.reduce((sum, p) => sum + p.revenue, 0);
        const ordersSum = window.reduce((sum, p) => sum + p.orders, 0);

        return {
          date: point.date,
          revenue: round2(point.revenue),
          orders: point.orders,
          revenue7d: round2(revenueSum / windowSize),
          orders7d: round2(ordersSum / windowSize),
        };
      });

      return res.json({ points });
    } catch (err: any) {
      console.error("GET /analytics/rolling error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
