import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import {
  computeTopCategory,
  fullName,
  lastOrderSelect,
  mapOrderItemsWithCategories,
  parsePositiveInt,
} from "./utils";

export function registerInactiveRoute(router: Router) {
  router.get("/inactive", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const days = parsePositiveInt(
        req.query.days as string | undefined,
        30,
        1,
        365
      );
      const limit = parsePositiveInt(
        req.query.limit as string | undefined,
        200,
        1,
        500
      );
      const cursor = parsePositiveInt(
        req.query.cursor as string | undefined,
        0,
        0,
        1_000_000
      );

      if (!storeId) {
        return res.status(400).json({ error: "storeId is required" });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const customers = await prisma.customer.findMany({
        where: {
          storeId,
          email: { not: "" },
          orders: {
            some: { createdAt: { lt: cutoff } },
            none: { createdAt: { gte: cutoff } },
          },
        },
        orderBy: { id: "asc" },
        skip: cursor,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          lastActiveAt: true,
          _count: { select: { orders: true } },
          orders: lastOrderSelect,
        },
      });

      const data = customers.map((c) => {
        const lastOrder = c.orders[0] ?? null;
        const lastItems = mapOrderItemsWithCategories(lastOrder?.items ?? []);
        const topCategory = computeTopCategory(lastItems);

        return {
          customerId: c.id,
          email: c.email,
          name: fullName(c.firstName, c.lastName) || null,
          phone: c.phone,
          ordersCount: c._count?.orders ?? 0,
          lastActiveAt: c.lastActiveAt,
          lastOrderAt: lastOrder?.createdAt ?? null,
          lastOrderTotal: lastOrder ? round2(lastOrder.total ?? 0) : null,
          lastOrderDiscount: lastOrder ? round2(lastOrder.discountTotal ?? 0) : null,
          lastOrderShipping: lastOrder ? round2(lastOrder.shippingTotal ?? 0) : null,
          lastOrderTax: lastOrder ? round2(lastOrder.taxTotal ?? 0) : null,
          lastOrderCoupons: lastOrder
            ? (lastOrder.coupons || [])
                .map((c) => c.coupon?.code)
                .filter(Boolean)
            : [],
          lastItems,
          topCategory,
        };
      });

      return res.json({
        storeId,
        days,
        cutoff: cutoff.toISOString(),
        count: data.length,
        nextCursor: customers.length === limit ? cursor + limit : null,
        data,
      });
    } catch (err: any) {
      console.error("GET /customers/inactive error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
