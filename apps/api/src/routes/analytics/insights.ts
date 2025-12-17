import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { parseDateRange, round2, ymd } from "./utils";

function parseIntParam(val: string | undefined, fallback: number, min = 1, max = 100) {
  const n = parseInt(val ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function registerInsightRoutes(router: Router) {
  // Peak revenue day in range
  router.get("/peaks", async (req: Request, res: Response) => {
    try {
      const { storeId, from, to } = req.query as { storeId?: string; from?: string; to?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });
      const { fromDate, toDate } = parseDateRange(from, to);

      const peak = await prisma.dailySummary.findFirst({
        where: { storeId, date: { gte: fromDate, lte: toDate } },
        orderBy: { revenue: "desc" },
        select: { date: true, revenue: true, ordersCount: true, aov: true }
      });

      return res.json({
        peakRevenueDay: peak
          ? {
              date: ymd(peak.date),
              revenue: round2(peak.revenue),
              orders: peak.ordersCount,
              aov: round2(peak.aov)
            }
          : null
      });
    } catch (err: any) {
      console.error("GET /analytics/peaks error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // Simple anomalies: > 2 std dev from trailing mean on revenue or orders
  router.get("/anomalies", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      const fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 59);
      fromDate.setHours(0, 0, 0, 0);

      const rows = await prisma.dailySummary.findMany({
        where: { storeId, date: { gte: fromDate, lte: toDate } },
        select: { date: true, revenue: true, ordersCount: true }
      });
      if (!rows.length) return res.json({ anomalies: [] });

      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const stdev = (arr: number[], m: number) =>
        Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);

      const revs = rows.map((r) => r.revenue);
      const ords = rows.map((r) => r.ordersCount);
      const revMean = mean(revs);
      const ordMean = mean(ords);
      const revStd = stdev(revs, revMean);
      const ordStd = stdev(ords, ordMean);

      const anomalies = rows
        .map((r) => {
          const revZ = revStd ? (r.revenue - revMean) / revStd : 0;
          const ordZ = ordStd ? (r.ordersCount - ordMean) / ordStd : 0;
          const isAnomaly = Math.abs(revZ) >= 2 || Math.abs(ordZ) >= 2;
          return isAnomaly
            ? {
                date: ymd(r.date),
                revenue: round2(r.revenue),
                orders: r.ordersCount,
                revenueZ: round2(revZ),
                ordersZ: round2(ordZ)
              }
            : null;
        })
        .filter(Boolean)
        .slice(-10);

      return res.json({ anomalies });
    } catch (err: any) {
      console.error("GET /analytics/anomalies error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // Retention highlights: best/worst cohort month by retention rate
  router.get("/retention/highlights", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const cohorts = await prisma.cohortMonthly.findMany({
        where: { storeId, customersInCohort: { gt: 0 } },
        select: { cohortMonth: true, periodMonth: true, retentionRate: true, customersInCohort: true },
        orderBy: [{ retentionRate: "desc" }, { cohortMonth: "desc" }]
      });

      if (!cohorts.length) return res.json({ best: null, worst: null });

      const best = cohorts[0];
      const worst = cohorts[cohorts.length - 1];

      return res.json({
        best: {
          cohortMonth: ymd(best.cohortMonth),
          periodMonth: best.periodMonth,
          retentionRate: round2(best.retentionRate),
          customersInCohort: best.customersInCohort
        },
        worst: {
          cohortMonth: ymd(worst.cohortMonth),
          periodMonth: worst.periodMonth,
          retentionRate: round2(worst.retentionRate),
          customersInCohort: worst.customersInCohort
        }
      });
    } catch (err: any) {
      console.error("GET /analytics/retention/highlights error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // Repeat purchase rate for last 30/90 days
  router.get("/repeat-purchase", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const calc = async (days: number) => {
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        const from = new Date(to);
        from.setDate(from.getDate() - (days - 1));
        from.setHours(0, 0, 0, 0);

        const groups = await prisma.order.groupBy({
          by: ["customerId"],
          _count: { id: true },
          where: {
            storeId,
            customerId: { not: null },
            createdAt: { gte: from, lte: to }
          }
        });

        const totalCustomers = groups.length;
        const repeatCustomers = groups.filter((g) => g._count.id > 1).length;
        const rate = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

        return {
          days,
          from: ymd(from),
          to: ymd(to),
          totalCustomers,
          repeatCustomers,
          rate: round2(rate)
        };
      };

      const last30 = await calc(30);
      const last90 = await calc(90);

      return res.json({ last30, last90 });
    } catch (err: any) {
      console.error("GET /analytics/repeat-purchase error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // High-value orders over recent days
  router.get("/orders/high-value", async (req: Request, res: Response) => {
    try {
      const { storeId, days, limit } = req.query as {
        storeId?: string;
        days?: string;
        limit?: string;
      };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });
      const windowDays = parseIntParam(days, 7, 1, 90);
      const take = parseIntParam(limit, 5, 1, 25);

      const to = new Date();
      to.setHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setDate(from.getDate() - (windowDays - 1));
      from.setHours(0, 0, 0, 0);

      const orders = await prisma.order.findMany({
        where: { storeId, createdAt: { gte: from, lte: to } },
        select: {
          id: true,
          createdAt: true,
          total: true,
          status: true,
          customer: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { total: "desc" },
        take
      });

      const mapped = orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        total: round2(o.total),
        status: o.status,
        customer: o.customer
          ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim() ||
            o.customer.email
          : "Guest"
      }));

      return res.json({ orders: mapped, from: ymd(from), to: ymd(to) });
    } catch (err: any) {
      console.error("GET /analytics/orders/high-value error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });

  // Aging orders (pending/processing older than X days)
  router.get("/orders/aging", async (req: Request, res: Response) => {
    try {
      const { storeId, days, limit } = req.query as {
        storeId?: string;
        days?: string;
        limit?: string;
      };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });
      const ageDays = parseIntParam(days, 3, 1, 30);
      const take = parseIntParam(limit, 20, 1, 50);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ageDays);
      cutoff.setHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          storeId,
          status: { in: ["pending", "processing"] },
          createdAt: { lte: cutoff }
        },
        select: {
          id: true,
          createdAt: true,
          total: true,
          status: true,
          customer: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: "asc" },
        take
      });

      const mapped = orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        total: round2(o.total),
        status: o.status,
        customer: o.customer
          ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim() ||
            o.customer.email
          : "Guest",
        ageDays: Math.ceil((Date.now() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }));

      return res.json({ orders: mapped, cutoff: ymd(cutoff) });
    } catch (err: any) {
      console.error("GET /analytics/orders/aging error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
