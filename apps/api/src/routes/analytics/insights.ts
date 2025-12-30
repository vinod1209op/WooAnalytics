import { Router, Request, Response } from "express";
import {
  getAgingOrders,
  getAnomalies,
  getHighValueOrders,
  getPeakRevenueDay,
  getRepeatPurchaseRates,
  getRetentionHighlights,
} from "./insights-service";

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
      const peakRevenueDay = await getPeakRevenueDay(storeId, from, to);
      return res.json({ peakRevenueDay });
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

      const anomalies = await getAnomalies(storeId);
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

      const highlights = await getRetentionHighlights(storeId);
      return res.json(highlights);
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

      const rates = await getRepeatPurchaseRates(storeId, [30, 60, 90, 120]);
      return res.json(rates);
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

      const result = await getHighValueOrders(storeId, windowDays, take);
      return res.json(result);
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

      const result = await getAgingOrders(storeId, ageDays, take);
      return res.json(result);
    } catch (err: any) {
      console.error("GET /analytics/orders/aging error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
