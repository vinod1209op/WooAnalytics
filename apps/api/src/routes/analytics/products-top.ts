import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { parseDateQuery, round2 } from "./utils";

export function registerTopProductsRoute(router: Router) {
  router.get("/products/top", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);

      const groups = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, lineTotal: true },
        where: {
          order: {
            storeId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        },
        orderBy: {
          _sum: { lineTotal: "desc" },
        },
        take: 10,
      });

      const productIds = groups
        .map((g) => g.productId)
        .filter((id): id is number => id !== null);

      if (!productIds.length) {
        return res.json({ products: [] });
      }

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
        },
      });

      const productsById = new Map(products.map((p) => [p.id, p]));

      const result = groups
        .map((g) => {
          if (g.productId === null) return null;
          const p = productsById.get(g.productId);
          if (!p) return null;

          const revenue = g._sum.lineTotal ?? 0;
          const units = g._sum.quantity ?? 0;

          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            revenue: round2(revenue),
            units,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return res.json({ products: result });
    } catch (err: any) {
      console.error("GET /analytics/products/top error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
