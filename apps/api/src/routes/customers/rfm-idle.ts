import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { classifyIdle, IdleMetrics } from "./utils";

export function registerRfmIdleRoute(router: Router) {
  router.get("/rfm-idle", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
      const cursor = Math.max(Number(req.query.cursor) || 0, 0);

      if (!storeId) return res.status(400).json({ error: "storeId is required" });

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const customers = await prisma.customer.findMany({
        where: { storeId },
        orderBy: { id: "asc" },
        skip: cursor,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          orders: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          _count: { select: { orders: true } },
          score: {
            select: {
              segment: true,
              rfmScore: true,
            },
          },
        },
      });

      const result = customers.map((c) => {
        const lastOrderAt = c.orders[0]?.createdAt ?? null;
        const metrics: IdleMetrics = {
          ordersCount: c._count.orders,
          firstOrderAt: null,
          lastOrderAt,
          ltv: null,
          avgDaysBetweenOrders: null,
          daysSinceLastOrder: lastOrderAt
            ? Math.round((Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        };
        const idleSegment = classifyIdle(metrics, days);
        return {
          customerId: c.id,
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
          rfmSegment: c.score?.segment ?? null,
          rfmScore: c.score?.rfmScore ?? null,
          idleSegment,
          lastOrderAt,
          daysSinceLastOrder: metrics.daysSinceLastOrder,
        };
      });

      return res.json({
        storeId,
        days,
        cutoff: cutoff.toISOString(),
        count: result.length,
        nextCursor: customers.length === limit ? cursor + limit : null,
        data: result,
      });
    } catch (err: any) {
      console.error("GET /customers/rfm-idle error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
