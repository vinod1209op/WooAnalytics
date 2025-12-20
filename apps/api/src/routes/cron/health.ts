import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";

const router = Router();

router.get("/idle-health", async (req: Request, res: Response) => {
  try {
    const { storeId, thresholdPct: thresholdParam } = req.query as {
      storeId?: string;
      thresholdPct?: string;
    };
    const thresholdPct = Math.min(Math.max(Number(thresholdParam) || 50, 1), 500);
    if (!storeId) return res.status(400).json({ error: "storeId is required" });

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    const countToday = await prisma.customer.count({
      where: {
        storeId,
        orders: { none: { createdAt: { gte: new Date(today.getTime() - 30 * 86400000) } } },
      },
    });

    const countYesterday = await prisma.customer.count({
      where: {
        storeId,
        orders: { none: { createdAt: { gte: new Date(yesterday.getTime() - 30 * 86400000) } } },
      },
    });

    const changePct =
      countYesterday > 0 ? ((countToday - countYesterday) / countYesterday) * 100 : 0;

    const unhealthy = Math.abs(changePct) > thresholdPct;

    if (unhealthy) {
      console.warn("[idle-health] anomaly", { storeId, countToday, countYesterday, changePct });
    }

    return res.json({
      storeId,
      countToday,
      countYesterday,
      changePct: Math.round(changePct * 100) / 100,
      thresholdPct,
      healthy: !unhealthy,
    });
  } catch (err: any) {
    console.error("GET /cron/idle-health error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
