// apps/api/routes/kpis.ts
import { Router } from 'express';

const router = Router();

// Same baseline numbers you use in the frontend
const BASE = {
  revenue: 14724.86,
  orders: 73,
  aov: 201.71,
  units: 296,
  customers: 65,
};

router.get('/', (req, res) => {
  const { type = 'date', from, to, category, coupon } = req.query;

  let scale = 1;

  // date range scaling
  if (type === 'date' && typeof from === 'string' && typeof to === 'string') {
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');

    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      const ms = toDate.getTime() - fromDate.getTime();
      const days = Math.max(1, Math.round(ms / 86400000) + 1);
      scale = days / 30; // 30-day baseline
    }
  } else if (type === 'category' && typeof category === 'string' && category) {
    scale = 0.6;
  } else if (type === 'coupon' && typeof coupon === 'string' && coupon) {
    scale = 0.5;
  }

  const payload = {
    revenue: +(BASE.revenue * scale).toFixed(2),
    orders: Math.round(BASE.orders * scale),
    aov: BASE.aov, // keep AOV stable
    units: Math.round(BASE.units * scale),
    customers: Math.round(BASE.customers * scale),
  };

  res.json(payload);
});

export default router;