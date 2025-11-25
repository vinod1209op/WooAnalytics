import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildContinuousSeries, buildOrderWhere, parseDateQuery, round2, ymd } from "./utils";

export function registerNewVsReturningRoute(router: Router) {
  router.get("/new-vs-returning", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);

      const orders = await prisma.order.findMany({
        where: buildOrderWhere(req, fromDate, toDate),
        select: { id: true, createdAt: true, customerId: true },
        orderBy: { createdAt: "asc" },
      });

      const customerIds = Array.from(
        new Set(orders.map((o) => o.customerId).filter((id): id is number => id !== null))
      );

      const acquisitions = customerIds.length
        ? await prisma.customerAcquisition.findMany({
            where: {
              storeId,
              customerId: { in: customerIds },
              firstOrderDate: { lte: toDate },
            },
            select: { customerId: true, firstOrderDate: true },
          })
        : [];

      const firstOrderByCustomer = new Map<number, Date>(
        acquisitions.map((a) => [a.customerId, a.firstOrderDate])
      );

      const buckets = new Map<
        string,
        {
          newOrders: number;
          returningOrders: number;
          newCustomers: Set<number>;
          returningCustomers: Set<number>;
        }
      >();

      for (const order of orders) {
        const day = ymd(order.createdAt);
        const bucket =
          buckets.get(day) ??
          {
            newOrders: 0,
            returningOrders: 0,
            newCustomers: new Set<number>(),
            returningCustomers: new Set<number>(),
          };

        const customerId = order.customerId;
        const firstOrderDate = customerId ? firstOrderByCustomer.get(customerId) : null;
        const isFirstOrderInRange =
          !!firstOrderDate && firstOrderDate >= fromDate && firstOrderDate <= toDate;

        const isNew =
          isFirstOrderInRange && firstOrderDate && ymd(firstOrderDate) === ymd(order.createdAt);

        if (isNew) {
          bucket.newOrders += 1;
          if (customerId) {
            bucket.newCustomers.add(customerId);
          }
        } else {
          bucket.returningOrders += 1;
          if (customerId) {
            bucket.returningCustomers.add(customerId);
          }
        }

        buckets.set(day, bucket);
      }

      const points = buildContinuousSeries(fromDate, toDate, buckets, (day, bucket) => {
        const newOrders = bucket?.newOrders ?? 0;
        const returningOrders = bucket?.returningOrders ?? 0;
        const uniqueNew = bucket?.newCustomers ? bucket.newCustomers.size : 0;
        const uniqueReturning = bucket?.returningCustomers ? bucket.returningCustomers.size : 0;
        const totalCustomers = uniqueNew + uniqueReturning;

        const repeatRate = totalCustomers
          ? round2((uniqueReturning / totalCustomers) * 100)
          : 0;

        return {
          date: day,
          newOrders,
          returningOrders,
          newCustomers: uniqueNew,
          returningCustomers: uniqueReturning,
          repeatRate,
        };
      });

      return res.json({ points });
    } catch (err: any) {
      console.error("GET /analytics/new-vs-returning error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
