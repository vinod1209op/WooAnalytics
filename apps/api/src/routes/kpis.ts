import { Router } from "express";
import { parseDateRange } from "../utils/date";

const router = Router();

router.get("/", (req, res) => {
  try {
    const { start, end, days } = parseDateRange(req.query);

    const BASE = {
      revenue: 14724.86,
      orders: 73,
      aov: 201.71,
      units: 296,
      customers: 65,
    };

    const scale = days / 30;

    res.json({
      revenue: +(BASE.revenue * scale).toFixed(2),
      orders: Math.round(BASE.orders * scale),
      aov: BASE.aov,
      units: Math.round(BASE.units * scale),
      customers: Math.round(BASE.customers * scale),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;