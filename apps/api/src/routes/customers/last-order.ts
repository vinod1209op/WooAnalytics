import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import {
  fullName,
  lastOrderSelect,
  mapOrderItemsWithCategories,
} from "./utils";

export function registerLastOrderRoute(router: Router) {
  router.get("/last-order", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
      const email = req.query.email ? String(req.query.email) : undefined;

      if (!storeId) return res.status(400).json({ error: "storeId is required" });
      if (!customerId && !email) {
        return res.status(400).json({ error: "customerId or email is required" });
      }

      const customer = await prisma.customer.findFirst({
        where: {
          storeId,
          ...(customerId ? { id: customerId } : {}),
          ...(email ? { email } : {}),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          orders: lastOrderSelect,
        },
      });

      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const lastOrder = customer.orders[0] ?? null;
      if (!lastOrder) {
        return res.json({
          customer: {
            id: customer.id,
            email: customer.email,
            name: fullName(customer.firstName, customer.lastName) || null,
            phone: customer.phone,
          },
          lastOrder: null,
        });
      }

      const items = mapOrderItemsWithCategories(lastOrder.items ?? []);
      const categories = Array.from(new Set(items.flatMap((i) => i.categories || [])));

      return res.json({
        customer: {
          id: customer.id,
          email: customer.email,
          name: fullName(customer.firstName, customer.lastName) || null,
          phone: customer.phone,
        },
        lastOrder: {
          id: lastOrder.id,
          createdAt: lastOrder.createdAt.toISOString(),
          total: round2(lastOrder.total ?? 0),
          discount: round2(lastOrder.discountTotal ?? 0),
          shipping: round2(lastOrder.shippingTotal ?? 0),
          tax: round2(lastOrder.taxTotal ?? 0),
          coupons: (lastOrder.coupons || [])
            .map((c) => c.coupon?.code)
            .filter(Boolean),
          items,
          categories,
        },
      });
    } catch (err: any) {
      console.error("GET /customers/last-order error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
