import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /categories/top
 * Query: storeId (required), from (YYYY-MM-DD), to (YYYY-MM-DD)
 * Returns top categories by revenue (lineTotal) with units.
 */
router.get("/top", async (req: Request, res: Response) => {
  try {
    const { storeId, from, to, type, coupon } = req.query as {
      storeId?: string;
      from?: string;
      to?: string;
      type?: string;
      coupon?: string;
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

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          storeId,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          ...(type === "coupon" && coupon
            ? {
                coupons: {
                  some: {
                    coupon: { code: coupon },
                  },
                },
              }
            : {}),
        },
      },
      select: {
        quantity: true,
        lineTotal: true,
        unitPrice: true,
        product: {
          select: {
            categories: {
              select: {
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    type Bucket = { name: string; units: number; revenue: number };
    const buckets = new Map<number, Bucket>();
    let uncategorized: Bucket | null = null;

    for (const item of items) {
      const qty = item.quantity ?? 0;
      const revenue =
        item.lineTotal ??
        (typeof item.unitPrice === "number" ? item.unitPrice * qty : 0);

      const links = item.product?.categories ?? [];
      if (!links.length) {
        if (!uncategorized) {
          uncategorized = { name: "Uncategorized", units: 0, revenue: 0 };
        }
        uncategorized.units += qty;
        uncategorized.revenue += revenue;
        continue;
      }

      for (const link of links) {
        const category = link.category;
        if (!category) continue;
        const existing = buckets.get(category.id) ?? {
          name: category.name,
          units: 0,
          revenue: 0,
        };
        existing.units += qty;
        existing.revenue += revenue;
        buckets.set(category.id, existing);
      }
    }

    if (uncategorized) {
      buckets.set(-1, uncategorized);
    }

    const result = Array.from(buckets.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        units: c.units,
        revenue: Math.round(c.revenue * 100) / 100,
      }));

    return res.json(result);
  } catch (err: any) {
    console.error("GET /categories/top error:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
