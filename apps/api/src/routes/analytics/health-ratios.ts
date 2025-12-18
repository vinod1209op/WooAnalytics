import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { parseDateRange, round2 } from "./utils";

export function registerHealthRatiosRoute(router: Router) {
  router.get("/health-ratios", async (req: Request, res: Response) => {
    try {
      const { storeId, from, to } = req.query as {
        storeId?: string;
        from?: string;
        to?: string;
      };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const { fromDate, toDate } = parseDateRange(from, to);

      const ordersAgg = await prisma.order.aggregate({
        _sum: {
          total: true,
          discountTotal: true,
          shippingTotal: true,
          taxTotal: true,
        },
        where: {
          storeId,
          createdAt: { gte: fromDate, lte: toDate },
        },
      });

      const refundsAgg = await prisma.refund.aggregate({
        _sum: { amount: true },
        where: {
          storeId,
          createdAt: { gte: fromDate, lte: toDate },
        },
      });

      const grossRevenue = ordersAgg._sum.total ?? 0;
      const discounts = ordersAgg._sum.discountTotal ?? 0;
      const shipping = ordersAgg._sum.shippingTotal ?? 0;
      const tax = ordersAgg._sum.taxTotal ?? 0;
      const refunds = refundsAgg._sum.amount ?? 0;
      const netRevenue = grossRevenue - refunds - discounts;

      const refundRatePct = grossRevenue ? round2((refunds / grossRevenue) * 100) : 0;
      const discountRatePct = grossRevenue ? round2((discounts / grossRevenue) * 100) : 0;
      const grossMarginPct =
        grossRevenue ? round2(((grossRevenue - shipping - tax) / grossRevenue) * 100) : 0;
      const netMarginPct = grossRevenue ? round2((netRevenue / grossRevenue) * 100) : 0;

      return res.json({
        grossRevenue: round2(grossRevenue),
        netRevenue: round2(netRevenue),
        refunds: round2(refunds),
        discounts: round2(discounts),
        shipping: round2(shipping),
        tax: round2(tax),
        refundRatePct,
        discountRatePct,
        grossMarginPct,
        netMarginPct,
        range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      });
    } catch (err: any) {
      console.error("GET /analytics/health-ratios error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
