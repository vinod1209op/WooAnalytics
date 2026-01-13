// apps/api/src/routes/stores.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /stores -> list all (for dropdowns, etc.)
router.get('/', async (req: Request, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      select: { id: true, name: true, wooBaseUrl: true, wooKey: true, wooSecret: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(stores);
  } catch (e: any) {
    console.error('GET /stores error:', e);
    res.status(500).json({ error: e.message });
  }
});

// OPTIONAL: GET /stores/default -> whichever is marked default
router.get('/default', async (req: Request, res: Response) => {
  try {
    // Option A: you add a boolean `isDefault` to Store model
    const store = await prisma.store.findFirst({
      select: { id: true, name: true, wooBaseUrl: true, wooKey: true, wooSecret: true, createdAt: true },
      orderBy: { createdAt: 'asc'}
    });

    if(!store) {
      return res.status(404).json({error: 'No stores'});
    }

    const firstOrderAgg = await prisma.order.aggregate({
      _min: { createdAt: true },
      where: { storeId: store.id },
    });

    res.json({
      ...store,
      firstOrderAt: firstOrderAgg._min.createdAt?.toISOString() ?? null,
    });
  } catch (e: any) {
    console.error('GET /stores/default error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
