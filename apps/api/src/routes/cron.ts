import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { classifyIdle, IdleMetrics } from "./customers/utils";
import { INTERNAL_API_BASE } from "./assistant/config";

const router = Router();

router.get("/idle-snapshot", async (req: Request, res: Response) => {
  try {
    const { storeId, days: daysParam } = req.query as {
      storeId?: string;
      days?: string;
    };
    const auth = req.headers.authorization;
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!storeId) return res.status(400).json({ error: "storeId is required" });

    const days = Math.min(Math.max(Number(daysParam) || 30, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate orders per customer for this store
    const aggregates = await prisma.order.groupBy({
      by: ["customerId"],
      where: { storeId },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });

    const segments: Record<string, number> = {};

    for (const agg of aggregates) {
      if (!agg.customerId) continue;
      const last = agg._max.createdAt ?? null;
      const metrics: IdleMetrics = {
        ordersCount: agg._count._all ?? 0,
        firstOrderAt: null,
        lastOrderAt: last,
        ltv: agg._sum.total ?? 0,
        avgDaysBetweenOrders: null,
        daysSinceLastOrder: last
          ? Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
      const seg = classifyIdle(metrics, days);
      segments[seg] = (segments[seg] || 0) + 1;
    }

    const base =
      INTERNAL_API_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      `http://localhost:${process.env.PORT || 3001}`;

    const csvUrl = new URL("/customers/inactive", base);
    csvUrl.searchParams.set("storeId", storeId);
    csvUrl.searchParams.set("days", String(days));
    csvUrl.searchParams.set("format", "csv");

    const csvBySegment: Record<string, string> = {};
    Object.keys(segments).forEach((seg) => {
      const url = new URL(csvUrl.toString());
      url.searchParams.set("segment", seg);
      csvBySegment[seg] = url.toString();
    });

    return res.json({
      storeId,
      days,
      cutoff: cutoff.toISOString(),
      segments,
      csv: csvUrl.toString(),
      csvBySegment,
    });
  } catch (err: any) {
    console.error("GET /cron/idle-snapshot error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
