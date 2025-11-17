// api/src/routes/customers.ts
import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /customers/rfm
 * Query:
 *  - storeId (required)
 *  - from (optional, YYYY-MM-DD)
 *  - to   (optional, YYYY-MM-DD)
 *
 * Returns one row per customer with RFM metrics.
 */
router.get("/", async (req, res) => {
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

    let fromDate =
    typeof from === 'string' && from
        ? new Date(from + 'T00:00:00')
        : new Date(now);
    let toDate =
    typeof to === 'string' && to
        ? new Date(to + 'T23:59:59.999')
        : new Date(now);

   if (!from || !to) {
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
      return res.status(400).json({ error: 'Invalid from/to date' });
    }

    // Group orders by customer to compute R, F, M
    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate && { gte: fromDate }),
                ...(toDate && { lte: toDate }),
              },
            }
          : {}),
      },
      _count: { _all: true },       // Frequency = number of orders
      _sum: { total: true },        // Monetary = sum of order total
      _max: { createdAt: true },    // Recency = last order date
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 100, // top 100 customers by value – adjust if you want
    });

    const customerIds = groups
      .map((g) => g.customerId)
      .filter((id): id is number => id !== null);

    if (!customerIds.length) {
      return res.json([]);
    }

    // Get customer details
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    const customersById = new Map(customers.map((c) => [c.id, c]));

    const result = groups
      .map((g) => {
        if (g.customerId === null) return null;
        const c = customersById.get(g.customerId);
        if (!c) return null;


        const customerName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

        const lastOrderDate = g._max.createdAt!;
        const diffMs = now.getTime() - lastOrderDate.getTime();
        const recencyDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const frequency = g._count._all;
        const monetary = g._sum.total ?? 0;

        return {
          id: c.id,
          name: customerName,
          email: c.email,
          phone: c.phone,
          last_order_date: lastOrderDate,
          recency_days: recencyDays,
          frequency,
          monetary,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return res.json(result);
  } catch (err: any) {
    console.error("GET /customers/rfm error:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
