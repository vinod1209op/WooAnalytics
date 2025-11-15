import { Router } from "express";
import { parseDateRange } from "../utils/date";

const router = Router();

router.get("/", (req, res) => {
  try {
    const { start, end, days } = parseDateRange(req.query);

    const points = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);

      const label = d.toISOString().slice(0, 10);

      const center = (days - 1) / 2;
      const dist = Math.abs(i - center);
      const peak = 1 - dist / (days / 2 || 1);

      const revenue = 400 + peak * 800;
      const orders = 5 + Math.round(peak * 15);

      points.push({
        date: label,
        revenue: +revenue.toFixed(2),
        orders,
      });
    }

    res.json(points);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;