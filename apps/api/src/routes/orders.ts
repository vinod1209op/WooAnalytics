import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /orders/recent
 * Query: storeId (required), from, to, limit (default 10)
 * Returns most recent orders in range with customer + totals.
 */
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const { storeId, from, to, limit } = req.query as {
      storeId?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    if (!storeId) {
      return res.status(400).json({ error: "Missing storeId" });
    }

    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
      fromDate = new Date(from + "T00:00:00");
      toDate = new Date(to + "T23:59:59.999");
    } else {
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    const take = Math.min(Math.max(parseInt(limit ?? "10", 10), 1), 50);

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    const result = orders.map((o) => {
      const nameParts = [o.customer?.firstName, o.customer?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const customerName = nameParts || o.customer?.email || "Guest";

      return {
        id: o.id,
        date: o.createdAt.toISOString(),
        status: o.status ?? "unknown",
        total: Math.round((o.total ?? 0) * 100) / 100,
        customer: customerName,
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error("GET /orders/recent error:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
