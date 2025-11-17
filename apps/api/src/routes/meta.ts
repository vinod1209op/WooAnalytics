import { Router, Request, Response } from 'express';
import { prisma } from './prisma';

const router = Router();

// GET /meta/categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId || typeof storeId !== 'string'){
      return res.status(400).json({ error: "No storeId"})
    }

    const categories = await prisma.product.findMany({
      where: { storeId },
      select: { name: true },
      distinct: ['id'],
      orderBy: { createdAt: 'asc'},
    });

    res.json(categories.map(c => c.name));
  } catch (e: any) {
    console.error('GET /meta/categories error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /meta/coupons
router.get('/coupons', async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId || typeof storeId !== 'string'){
      return res.status(400).json({ error: "No storeId"})
    }

    const coupons = await prisma.coupon.findMany({
      where: { storeId },
      select: { code: true },
      orderBy: { code: 'asc' }
    });

    res.json(coupons.map(c => c.code));
  } catch (e: any) {
    console.error('GET /meta/coupons error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;