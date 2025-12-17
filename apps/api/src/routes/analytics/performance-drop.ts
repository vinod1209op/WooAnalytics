import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { parseDateRange, round2 } from "./utils";

type Range = { fromDate: Date; toDate: Date };

function getPrevRange({ fromDate, toDate }: Range): Range {
  const diffMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diffMs);
  return { fromDate: prevFrom, toDate: prevTo };
}

export function registerPerformanceDropRoutes(router: Router) {
  router.get("/performance-drop/products", async (req: Request, res: Response) => {
    try {
      const { storeId, from, to, limit } = req.query as {
        storeId?: string;
        from?: string;
        to?: string;
        limit?: string;
      };

      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const currentRange = parseDateRange(from, to);
      const prevRange = getPrevRange(currentRange);
      const take = Math.min(Math.max(parseInt(limit ?? "5", 10), 1), 20);

      const current = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { lineTotal: true, quantity: true },
        where: {
          order: {
            storeId,
            createdAt: { gte: currentRange.fromDate, lte: currentRange.toDate },
          },
        },
      });

      const previous = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { lineTotal: true, quantity: true },
        where: {
          order: {
            storeId,
            createdAt: { gte: prevRange.fromDate, lte: prevRange.toDate },
          },
        },
      });

      const prevMap = new Map<number, { revenue: number; units: number }>();
      previous.forEach((p) => {
        if (p.productId !== null) {
          prevMap.set(p.productId, {
            revenue: p._sum.lineTotal ?? 0,
            units: p._sum.quantity ?? 0,
          });
        }
      });

      const drops: {
        productId: number;
        name: string;
        revenue: number;
        revenuePrev: number;
        revenueChange: number;
        revenueChangePct: number;
        units: number;
        unitsPrev: number;
      }[] = [];

      for (const row of current) {
        if (row.productId === null) continue;
        const prev = prevMap.get(row.productId) ?? { revenue: 0, units: 0 };
        const revenue = row._sum.lineTotal ?? 0;
        const units = row._sum.quantity ?? 0;
        const delta = revenue - prev.revenue;
        const pct = prev.revenue ? (delta / prev.revenue) * 100 : revenue ? 100 : 0;
        drops.push({
          productId: row.productId,
          name: "",
          revenue: round2(revenue),
          revenuePrev: round2(prev.revenue),
          revenueChange: round2(delta),
          revenueChangePct: round2(pct),
          units: units ?? 0,
          unitsPrev: prev.units ?? 0,
        });
      }

      // Also include products that existed only in previous period (drop to zero)
      for (const [productId, prev] of prevMap.entries()) {
        if (current.find((c) => c.productId === productId)) continue;
        drops.push({
          productId,
          name: "",
          revenue: 0,
          revenuePrev: round2(prev.revenue),
          revenueChange: round2(0 - prev.revenue),
          revenueChangePct: round2(prev.revenue ? -100 : 0),
          units: 0,
          unitsPrev: prev.units,
        });
      }

      drops.sort((a, b) => a.revenueChange - b.revenueChange);
      const worst = drops.slice(0, take);

      const productIds = worst.map((w) => w.productId);
      const products = productIds.length
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : [];
      const nameMap = new Map(products.map((p) => [p.id, p.name]));

      const result = worst.map((w) => ({
        ...w,
        name: nameMap.get(w.productId) ?? "Unknown product",
      }));

      return res.json({ products: result });
    } catch (err: any) {
      console.error("GET /analytics/performance-drop/products error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  router.get("/performance-drop/categories", async (req: Request, res: Response) => {
    try {
      const { storeId, from, to, limit } = req.query as {
        storeId?: string;
        from?: string;
        to?: string;
        limit?: string;
      };

      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const currentRange = parseDateRange(from, to);
      const prevRange = getPrevRange(currentRange);
      const take = Math.min(Math.max(parseInt(limit ?? "5", 10), 1), 20);

      const currentItems = await prisma.orderItem.findMany({
        where: {
          order: {
            storeId,
            createdAt: { gte: currentRange.fromDate, lte: currentRange.toDate },
          },
        },
        select: {
          quantity: true,
          lineTotal: true,
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

      const prevItems = await prisma.orderItem.findMany({
        where: {
          order: {
            storeId,
            createdAt: { gte: prevRange.fromDate, lte: prevRange.toDate },
          },
        },
        select: {
          quantity: true,
          lineTotal: true,
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

      type Bucket = { name: string; revenue: number; units: number };
      const currentBuckets = new Map<number, Bucket>();
      const prevBuckets = new Map<number, Bucket>();

      const roll = (items: typeof currentItems, map: Map<number, Bucket>) => {
        for (const item of items) {
          const qty = item.quantity ?? 0;
          const revenue = item.lineTotal ?? 0;
          const cats = item.product?.categories ?? [];
          if (!cats.length) continue;
          for (const c of cats) {
            const cat = c.category;
            if (!cat) continue;
            const bucket = map.get(cat.id) ?? { name: cat.name, revenue: 0, units: 0 };
            bucket.revenue += revenue;
            bucket.units += qty;
            map.set(cat.id, bucket);
          }
        }
      };

      roll(currentItems, currentBuckets);
      roll(prevItems, prevBuckets);

      const drops: any[] = [];
      for (const [id, cur] of currentBuckets.entries()) {
        const prev = prevBuckets.get(id) ?? { name: cur.name, revenue: 0, units: 0 };
        const delta = cur.revenue - prev.revenue;
        const pct = prev.revenue ? (delta / prev.revenue) * 100 : cur.revenue ? 100 : 0;
        drops.push({
          categoryId: id,
          name: cur.name,
          revenue: round2(cur.revenue),
          revenuePrev: round2(prev.revenue),
          revenueChange: round2(delta),
          revenueChangePct: round2(pct),
          units: cur.units,
          unitsPrev: prev.units,
        });
      }
      for (const [id, prev] of prevBuckets.entries()) {
        if (currentBuckets.has(id)) continue;
        drops.push({
          categoryId: id,
          name: prev.name,
          revenue: 0,
          revenuePrev: round2(prev.revenue),
          revenueChange: round2(0 - prev.revenue),
          revenueChangePct: round2(prev.revenue ? -100 : 0),
          units: 0,
          unitsPrev: prev.units,
        });
      }

      drops.sort((a, b) => a.revenueChange - b.revenueChange);
      return res.json({ categories: drops.slice(0, take) });
    } catch (err: any) {
      console.error("GET /analytics/performance-drop/categories error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
