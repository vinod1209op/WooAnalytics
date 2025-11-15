// apps/api/routes/segments.ts
import { Router } from 'express';

const router = Router();

interface SegmentSummary {
  segment: string;    // e.g. "Champions"
  customers: number;  // count of customers in that segment
}

router.get('/', (req, res) => {
  const { type = 'date', category, coupon } = req.query;

  // Base mock segment counts (these match your chart idea:
  // Champions, Loyal, At Risk, About to Sleep)
  const base: SegmentSummary[] = [
    { segment: 'Champions',      customers: 65 },
    { segment: 'Loyal',          customers: 40 },
    { segment: 'Promising',      customers: 28 },
    { segment: 'At Risk',        customers: 15 },
  ];

  // Simple demo filter logic:
  let multiplier = 1;

  if (type === 'category' && typeof category === 'string' && category) {
    multiplier = 0.7;
  } else if (type === 'coupon' && typeof coupon === 'string' && coupon) {
    multiplier = 0.5;
  }

  const segments: SegmentSummary[] = base.map((s) => ({
    segment: s.segment,
    customers: Math.max(0, Math.round(s.customers * multiplier)),
  }));

  res.json({ segments });
});

export default router;