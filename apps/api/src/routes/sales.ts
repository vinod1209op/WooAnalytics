// apps/api/routes/sales.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

interface SalesPoint {
  date: string;   // "YYYY-MM-DD"
  revenue: number;
  orders: number;
}

// helper: Date -> "YYYY-MM-DD"
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { storeId, from, to } = req.query as {
      storeId?: string;
      from?: string;
      to?: string;
    };

    if (!storeId) {
      return res.status(400).json({ error: "Missing storeId" });
    }

    const now = new Date();

    // Build date range
    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
      fromDate = new Date(from + "T00:00:00");
      toDate = new Date(to + "T23:59:59.999");
    } else {
      // default: last 30 days
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);

      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    // 1) Fetch all orders in range for this store
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        total: true, // total revenue for the order
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 2) Aggregate by day in memory
    const byDay = new Map<
      string,
      { revenue: number; orders: number }
    >();

    for (const order of orders) {
      const day = ymd(order.createdAt);
      const existing = byDay.get(day) ?? { revenue: 0, orders: 0 };
      existing.revenue += order.total ?? 0;
      existing.orders += 1;
      byDay.set(day, existing);
    }

    // 3) Build full continuous series from fromDate → toDate
    const points: SalesPoint[] = [];
    const cursor = new Date(fromDate);

    while (cursor <= toDate) {
      const day = ymd(cursor);
      const bucket = byDay.get(day);

      const revenue = bucket?.revenue ?? 0;
      const ordersCount = bucket?.orders ?? 0;

      points.push({
        date: day,
        revenue: Math.round(revenue * 100) / 100,
        orders: ordersCount,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return res.json({ sales: points });
  } catch (err: any) {
    console.error("GET /sales error:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
