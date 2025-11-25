import { Router, Request, Response } from "express";
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /products/popular
 *
 * Query params:
 *   - storeId: string (required)
 *   - from: YYYY-MM-DD (optional)
 *   - to:   YYYY-MM-DD (optional)
 *
 * Returns top 10 products by units sold (total_sales) in the date range.
 */

 type ProductGroup = {
  productId: number | null;
  _sum: {
    quantity: number | null;
  };
};

type ProductSummary = {
  id: number;
  name: string | null;
  sku: string | null;
  price: number | null;
};

router.get("/popular", async (req: Request, res: Response) => {
  try {
    console.log("GET /products/popular query:", req.query);
    const { storeId, from, to, type, category, coupon } = req.query as {
      storeId: string;
      from?: string;
      to?: string;
      type?: string;
      category?: string;
      coupon?: string;
    };

    if (!storeId) {
      return res.status(400).json({ error: "Missing storeId" });
    }

    // Date range
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

    // 🔁 group order items by product and sum quantity
    const groups = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        order: {
          storeId,
          ...(fromDate || toDate
            ? {
                createdAt: {
                  ...(fromDate && { gte: fromDate }),
                  ...(toDate && { lte: toDate }),
                },
              }
            : {}),
          ...(type === 'coupon' && coupon
            ? {
                coupons: {
                  some: {
                    coupon: { code: coupon },
                  },
                },
              }
            : {}),
        },
        ...(type === 'category' && category
          ? {
              product: {
                categories: {
                  some: {
                    category: { name: category },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 10,
    });

    // 👉 productId is (number | null), so filter out nulls
    const productIds = groups
      .map((g) => g.productId)
      .filter((id): id is number => id !== null); // ⬅ type guard to get number[]

    if (productIds.length === 0) {
      return res.json([]);
    }

    // Fetch product details for those IDs
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
      },
    });



    // Map by id for easy lookup
    const productsById = new Map<number, ProductSummary>(
      products.map((p) => [p.id, p])
    );

    // Shape the response for the frontend table
    const result = groups
      .map((g: ProductGroup) => {
        // Guard against null productId
        if (g.productId === null) return null;

        const p = productsById.get(g.productId);
        if (!p) return null;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          total_sales: g._sum.quantity ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return res.json(result);
  } catch (e: any) {
    console.error("GET /products/popular error:", e);
    return res
      .status(500)
      .json({ error: e?.message ?? "Internal server error" });
  }
});

export default router;
