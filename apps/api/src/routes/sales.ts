// apps/api/routes/sales-series.ts
import { Router } from 'express';

const router = Router();

interface SalesPoint {
  date: string;    // "YYYY-MM-DD"
  revenue: number;
  orders: number;
}

// helper: Date -> "YYYY-MM-DD"
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const { type = 'date', from, to, category, coupon } = req.query;

  // 1) Figure out date range
  let fromDate: Date;
  let toDate: Date;

  if (typeof from === 'string' && typeof to === 'string') {
    fromDate = new Date(from + 'T00:00:00');
    toDate = new Date(to + 'T00:00:00');
  } else {
    // default: last 30 days
    toDate = new Date();
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 29);
  }

  // 2) Generate fake series
  const points: SalesPoint[] = [];
  const cursor = new Date(fromDate);

  while (cursor <= toDate) {
    const dayIndex = points.length;

    // base revenue with a weekly bump
    const base =
      400 +
      (dayIndex % 7 === 0 ? 600 : 0); // spike every 7 days

    let multiplier = 1;
    if (type === 'category' && typeof category === 'string' && category) {
      multiplier = 0.7;
    } else if (type === 'coupon' && typeof coupon === 'string' && coupon) {
      multiplier = 0.5;
    }

    const revenue = base * multiplier;
    const orders = Math.max(1, Math.round(revenue / 200));

    points.push({
      date: ymd(cursor),
      revenue: +revenue.toFixed(2),
      orders,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  res.json({ sales: points });
});

export default router;
