import { Router } from "express";
import { parseDateRange } from "../utils/date";

const router = Router();

/**
 * We'll return an array of cells like:
 * { recency: 5, frequency: 5, count: 30, score: 5 }
 */
router.get("/heatmap", (req, res) => {
  try {
    const { days } = parseDateRange(req.query);

    const { type, category, coupon } = req.query as {
      type?: string;
      category?: string;
      coupon?: string;
    };

    let factor = days / 30;
    if (type === "category" && category) factor *= 0.7;
    if (type === "coupon" && coupon) factor *= 0.5;

    const cells = [
      { recency: 5, frequency: 5, base: 30 },
      { recency: 4, frequency: 4, base: 20 },
      { recency: 3, frequency: 3, base: 15 },
      { recency: 2, frequency: 2, base: 10 },
      { recency: 1, frequency: 1, base: 5 },
      { recency: 5, frequency: 2, base: 8 },
      { recency: 2, frequency: 5, base: 7 },
    ];

    const scaled = cells.map((c) => {
      const count = Math.max(0, Math.round(c.base * factor));
      const score = Math.min(5, Math.max(0, Math.round((count / 30) * 5)));
      return { recency: c.recency, frequency: c.frequency, count, score };
    });

    res.json(scaled);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;