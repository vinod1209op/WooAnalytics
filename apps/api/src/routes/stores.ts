// apps/api/src/routes/stores.ts
import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /stores -> list all (for dropdowns, etc.)
router.get('/', async (_req, res) => {
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
router.get('/default', async (_req, res) => {
  try {
    // Option A: you add a boolean `isDefault` to Store model
    const store = await prisma.store.findFirst({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc'}
    });

    // Fallback: first store if no isDefault
    const effective = store ?? await prisma.store.findFirst({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!effective) return res.status(404).json({ error: 'No stores found' });

    res.json(effective);
  } catch (e: any) {
    console.error('GET /stores/default error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;