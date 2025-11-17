// apps/api/routes/segments.ts
import { Router, Request, Response } from "express";
import { prisma } from './prisma';

const router = Router();

type SegmentPoint = {
  segment: string; // e.g. "Champions"
  customers: number; // number of customers in this segment
};

/**
 * GET /segments
 *
 * Query:
 *  - storeId (required)
 *  - from   (optional, YYYY-MM-DD)
 *  - to     (optional, YYYY-MM-DD)
 *
 * Uses orders in the date range from the given store to compute
 * basic RFM metrics per customer, then buckets them into segments
 * and returns counts per segment.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { storeId, from, to } = req.query as {
      storeId?: string;
      from?: string;
      to?: string;
    };

    if (!storeId) {
      return res.status(400).json({ error: "Missing storeId" });
    }

    const now = new Date();

    // Date range: if from/to provided, use them; otherwise default last 30 days
    let fromDate =
      typeof from === "string" && from
        ? new Date(from + "T00:00:00")
        : new Date(now);
    let toDate =
      typeof to === "string" && to
        ? new Date(to + "T23:59:59.999")
        : new Date(now);

    if (!from || !to) {
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);

      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29); // last 30 days incl. today
      fromDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    // 1) Group orders by customer to compute R, F, M from real data
    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: { _all: true },    // Frequency = number of orders
      _sum: { total: true },     // Monetary = sum of order total
      _max: { createdAt: true }, // Recency = last order date
    });

    // Filter out null customerIds (just in case)
    const rows = groups
      .map((g) => {
        if (g.customerId === null || !g._max.createdAt) return null;

        const lastOrderDate = g._max.createdAt;
        const diffMs = now.getTime() - lastOrderDate.getTime();
        const recencyDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const frequency = g._count._all;
        const monetary = g._sum.total ?? 0;

        return {
          customerId: g.customerId,
          recencyDays,
          frequency,
          monetary,
        };
      })
      .filter((x): x is {
        customerId: number;
        recencyDays: number;
        frequency: number;
        monetary: number;
      } => x !== null);

    if (!rows.length) {
      return res.json({ segments: [] as SegmentPoint[] });
    }

    // 2) RFM scoring helpers (simple cutoffs – can tweak later)
    function getRecencyScore(days: number): number {
      if (days <= 7) return 5;
      if (days <= 30) return 4;
      if (days <= 90) return 3;
      if (days <= 180) return 2;
      return 1;
    }

    function getFrequencyScore(freq: number): number {
      if (freq >= 10) return 5;
      if (freq >= 5) return 4;
      if (freq >= 3) return 3;
      if (freq >= 2) return 2;
      return 1;
    }

    function getMonetaryScore(amount: number): number {
      if (amount >= 1000) return 5;
      if (amount >= 500) return 4;
      if (amount >= 200) return 3;
      if (amount >= 100) return 2;
      return 1;
    }

    function getSegmentLabel(
      rScore: number,
      fScore: number,
      mScore: number
    ): string {
      // Very simple rules – adjust if you and your supervisor want
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) return "Champions";
      if (rScore >= 3 && fScore >= 3) return "Loyal";
      if (rScore >= 3 && fScore <= 2) return "Promising";
      return "At Risk";
    }

    // 3) Assign each customer to a segment and count them
    const segmentCounts = new Map<string, number>();

    for (const row of rows) {
      const r = getRecencyScore(row.recencyDays);
      const f = getFrequencyScore(row.frequency);
      const m = getMonetaryScore(row.monetary);

      const segment = getSegmentLabel(r, f, m);
      segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
    }

    const segments: SegmentPoint[] = Array.from(segmentCounts.entries()).map(
      ([segment, customers]) => ({ segment, customers })
    );

    return res.json({ segments });
  } catch (err: any) {
    console.error("GET /segments error:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
