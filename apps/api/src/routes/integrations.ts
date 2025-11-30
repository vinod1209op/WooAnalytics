import { Router, Request, Response } from 'express';
import { createKpiSnapshot, KpiSummary } from '../integrations/notion';

const router = Router();

router.post('/kpi-snapshots', async (req: Request, res: Response) => {
  try {
    const { storeId, periodLabel, date, kpis, databaseId } = req.body ?? {};

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'storeId is required' });
    }

    if (!kpis || typeof kpis !== 'object') {
      return res.status(400).json({ error: 'kpis payload is required' });
    }

    const result = await createKpiSnapshot({
      storeId,
      periodLabel,
      date,
      kpis: kpis as KpiSummary,
      databaseId,
    });

    res.json({ id: result.id, url: (result as any)?.url ?? null });
  } catch (err: any) {
    console.error('POST /integrations/kpi-snapshots error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to push KPI snapshot to Notion' });
  }
});

export default router;
