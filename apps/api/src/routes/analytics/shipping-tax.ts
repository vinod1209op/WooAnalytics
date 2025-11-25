import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerShippingTaxRoute(router: Router) {
  router.get("/shipping-tax", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);

      const orders = await prisma.order.findMany({
        where: buildOrderWhere(req, fromDate, toDate),
        select: { createdAt: true, shippingTotal: true, taxTotal: true },
      });

      const buckets = new Map<
        string,
        {
          shipping: number;
          tax: number;
        }
      >();

      for (const order of orders) {
        const day = ymd(order.createdAt);
        const bucket = buckets.get(day) ?? { shipping: 0, tax: 0 };
        bucket.shipping += order.shippingTotal ?? 0;
        bucket.tax += order.taxTotal ?? 0;
        buckets.set(day, bucket);
      }

      const points = buildContinuousSeries(fromDate, toDate, buckets, (day, bucket) => ({
        date: day,
        shipping: round2(bucket?.shipping ?? 0),
        tax: round2(bucket?.tax ?? 0),
      }));

      return res.json({ points });
    } catch (err: any) {
      console.error("GET /analytics/shipping-tax error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
