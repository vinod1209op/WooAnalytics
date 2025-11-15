import { Router } from "express";
import { parseDateRange } from "../utils/date";

const router = Router();

const BASE_SEGMENTS = [
  { segment: "Champions", customers: 32, revenue: 8200 },
  { segment: "Loyal", customers: 48, revenue: 6100 },
  { segment: "Big Spenders", customers: 15, revenue: 5300 },
  { segment: "At Risk", customers: 27, revenue: 2400 },
  { segment: "Hibernating", customers: 40, revenue: 1800 },
];

router.get("/summary", (req, res) => {
  try {
    const { start, end, days } = parseDateRange(req.query);

    let scale = days / 30; // 30-day baseline

    const { type, category, coupon } = req.query as {
      type?: string;
      category?: string;
      coupon?: string;
    };

    if (type === "category" && category) scale *= 0.7;
    if (type === "coupon" && coupon) scale *= 0.5;

    const result = BASE_SEGMENTS.map((s) => {
      const customers = Math.max(1, Math.round(s.customers * scale));
      const revenue = +(s.revenue * scale).toFixed(2);
      const avgValue = customers ? +(revenue / customers).toFixed(2) : 0;
      return { segment: s.segment, customers, revenue, avgValue };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;