import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export function createCustomersInsightsRouter() {
  const router = Router();

  // Last order for a customer (by email or customerId)
  router.get("/last-order", async (req: Request, res: Response) => {
    try {
      const { storeId, email, customerId } = req.query as {
        storeId?: string;
        email?: string;
        customerId?: string;
      };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const where: any = { storeId };
      if (customerId) {
        where.customerId = Number(customerId);
      } else if (email) {
        where.customer = { email: String(email) };
      } // else: fetch most recent order for the store

      const order = await prisma.order.findFirst({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            select: { productId: true, name: true, quantity: true, lineTotal: true }
          },
          customer: { select: { id: true, email: true, firstName: true, lastName: true } }
        }
      });

      if (!order) return res.json({ order: null });

      return res.json({
        order: {
          id: order.id,
          createdAt: order.createdAt,
          total: order.total,
          status: order.status,
          customer: order.customer,
          items: order.items
        }
      });
    } catch (err: any) {
      console.error("GET /customers/last-order error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // Inactive customers beyond N days
  router.get("/inactive", async (req: Request, res: Response) => {
    try {
      const { storeId, days, limit } = req.query as {
        storeId?: string;
        days?: string;
        limit?: string;
      };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });
      const cutoffDays = Math.max(parseInt(days || "30", 10), 1);
      const take = Math.min(Math.max(parseInt(limit || "50", 10), 1), 200);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - cutoffDays);

      // Use orders to derive last purchase
      const groups = await prisma.order.groupBy({
        by: ["customerId"],
        where: {
          storeId,
          customerId: { not: null }
        },
        _max: { createdAt: true },
        _count: { id: true },
        orderBy: { _max: { createdAt: "asc" } }
      });

      const inactiveIds = groups
        .filter((g) => g.customerId !== null && g._max.createdAt && g._max.createdAt < cutoff)
        .slice(0, take)
        .map((g) => ({
          customerId: g.customerId as number,
          lastOrderAt: g._max.createdAt as Date,
          ordersCount: g._count.id
        }));

      if (!inactiveIds.length) {
        return res.json({ customers: [] });
      }

      const details = await prisma.customer.findMany({
        where: { id: { in: inactiveIds.map((c) => c.customerId) } },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      const detailMap = new Map(details.map((d) => [d.id, d]));

      return res.json({
        customers: inactiveIds.map((c) => ({
          ...detailMap.get(c.customerId),
          lastOrderAt: c.lastOrderAt,
          ordersCount: c.ordersCount
        }))
      });
    } catch (err: any) {
      console.error("GET /customers/inactive error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  return router;
}

export default createCustomersInsightsRouter;
