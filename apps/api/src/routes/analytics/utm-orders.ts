import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { buildOrderWhere, parseDateQuery, round2 } from "./utils";

const DEFAULT_LIMIT = 10;
const DIRECT_LABEL = "Direct";
const MEDIUM_NONE_LABEL = "None";

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function registerUtmOrdersRoute(router: Router) {
  router.get("/utm-orders", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const { fromDate, toDate } = parseDateQuery(req);
      const baseWhere = buildOrderWhere(req, fromDate, toDate);
      const limit = Math.max(
        1,
        Math.min(25, Number(req.query.limit) || DEFAULT_LIMIT)
      );

      const orders = await prisma.order.findMany({
        where: baseWhere,
        select: {
          id: true,
          customerId: true,
          billingEmail: true,
          attribution: {
            select: {
              utmSource: true,
              utmMedium: true,
            },
          },
        },
      });

      const buckets = new Map<
        string,
        {
          source: string;
          medium: string;
          orders: Set<number>;
          customers: Set<string>;
        }
      >();

      for (const order of orders) {
        const source = normalizeLabel(order.attribution?.utmSource, DIRECT_LABEL);
        const medium = normalizeLabel(order.attribution?.utmMedium, MEDIUM_NONE_LABEL);
        const key = `${source}||${medium}`;
        const bucket =
          buckets.get(key) ??
          {
            source,
            medium,
            orders: new Set<number>(),
            customers: new Set<string>(),
          };

        bucket.orders.add(order.id);

        const customerId = order.customerId ?? null;
        if (customerId != null) {
          bucket.customers.add(`id:${customerId}`);
        } else {
          const email = order.billingEmail?.trim().toLowerCase();
          if (email) {
            bucket.customers.add(`email:${email}`);
          }
        }

        buckets.set(key, bucket);
      }

      const totalOrders = orders.length;

      const points = Array.from(buckets.values())
        .map((bucket) => ({
          source: bucket.source,
          medium: bucket.medium,
          orders: bucket.orders.size,
          customers: bucket.customers.size,
          share: totalOrders
            ? round2((bucket.orders.size / totalOrders) * 100)
            : 0,
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, limit);

      return res.json({ totalOrders, points });
    } catch (err: any) {
      console.error("GET /analytics/utm-orders error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
