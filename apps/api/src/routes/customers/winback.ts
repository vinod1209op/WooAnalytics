import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import {
  fullName,
  mapOrderItemsWithCategories,
  parsePositiveInt,
  lastOrderSelect,
} from "./utils";

export function registerWinbackRoute(router: Router) {
  router.get("/:id/winback", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const days = parsePositiveInt(req.query.days as string | undefined, 30, 1, 365);
      const customerId = Number(req.params.id);

      if (!storeId) return res.status(400).json({ error: "storeId is required" });
      if (!Number.isFinite(customerId)) {
        return res.status(400).json({ error: "Invalid customer id" });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, storeId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          orders: lastOrderSelect,
        },
      });

      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const lastOrder = customer.orders[0];
      if (!lastOrder) return res.json({ eligible: false, reason: "no_orders" });

      const idleCheck = await prisma.customer.findFirst({
        where: {
          id: customerId,
          storeId,
          orders: {
            some: { createdAt: { lt: cutoff } },
            none: { createdAt: { gte: cutoff } },
          },
        },
        select: { id: true },
      });

      if (!idleCheck) {
        return res.json({ eligible: false, reason: "not_idle" });
      }

      const offer =
        days >= 90
          ? { type: "percent_off", value: 20 }
          : days >= 60
          ? { type: "percent_off", value: 15 }
          : { type: "percent_off", value: 10 };

      const primaryItem =
        lastOrder.items.find((i) => i.productId) ?? lastOrder.items[0] ?? null;
      const primaryProductId = primaryItem?.productId ?? null;

      let crossSell: Array<{ productId: number; times: number; name?: string }> = [];
      if (primaryProductId) {
        const rows = await prisma.$queryRaw<Array<{ product_id: number; times: number }>>`
          SELECT oi2."productId" as product_id, COUNT(*)::int as times
          FROM "order_items" oi1
          JOIN "order_items" oi2 ON oi1."orderId" = oi2."orderId"
          JOIN "orders" o ON o."id" = oi1."orderId"
          WHERE o."storeId" = ${storeId}
            AND oi1."productId" = ${primaryProductId}
            AND oi2."productId" IS NOT NULL
            AND oi2."productId" <> ${primaryProductId}
          GROUP BY oi2."productId"
          ORDER BY times DESC
          LIMIT 5
        `;

        const productIds = rows.map((r) => r.product_id);
        const products = productIds.length
          ? await prisma.product.findMany({
              where: { storeId, id: { in: productIds } },
              select: { id: true, name: true },
            })
          : [];
        const nameMap = new Map(products.map((p) => [p.id, p.name]));

        crossSell = rows.map((r) => ({
          productId: r.product_id,
          times: r.times,
          name: nameMap.get(r.product_id) ?? undefined,
        }));
      }

      return res.json({
        eligible: true,
        segment: `IDLE_${days}`,
        cutoff: cutoff.toISOString(),
        customer: {
          id: customer.id,
          email: customer.email,
          name: fullName(customer.firstName, customer.lastName) || null,
        },
        lastOrder: {
          id: lastOrder.id,
          createdAt: lastOrder.createdAt.toISOString(),
          total: round2(lastOrder.total ?? 0),
          items: mapOrderItemsWithCategories(lastOrder.items ?? []),
        },
        recommendation: {
          offer,
          primary: primaryItem
            ? { productId: primaryProductId, name: primaryItem.name }
            : null,
          crossSell,
          messageHint: primaryItem
            ? `We thought you might like more ${primaryItem.name}. Here is ${offer.value}% off your next order.`
            : `Here is ${offer.value}% off your next order—come back and see what is new.`,
        },
      });
    } catch (err: any) {
      console.error("GET /customers/:id/winback error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
