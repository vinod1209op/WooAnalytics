// apps/api/routes/rfm.ts
import { Router } from 'express';

const router = Router();

interface RfmBucket {
  bucket: string; // e.g. "R5-F5"
  count: number;
}

router.get('/', (req, res) => {
  const { type = 'date', category, coupon } = req.query;

  // Base mock RFM distribution (matches your frontend buckets)
  const base: RfmBucket[] = [
    { bucket: 'R5-F5', count: 60 },
    { bucket: 'R4-F4', count: 40 },
    { bucket: 'R3-F2', count: 25 },
    { bucket: 'R2-F1', count: 10 },
  ];

  let multiplier = 1;

  if (type === 'category' && typeof category === 'string' && category) {
    multiplier = 0.7;
  } else if (type === 'coupon' && typeof coupon === 'string' && coupon) {
    multiplier = 0.5;
  }

  const rfm: RfmBucket[] = base.map((b) => ({
    bucket: b.bucket,
    count: Math.max(0, Math.round(b.count * multiplier)),
  }));

  res.json({ rfm });
});

export default router;