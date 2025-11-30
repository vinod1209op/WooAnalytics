import { config } from 'dotenv';
import path from 'path';

// Load env from apps/api/.env (two levels up from /src/scripts)
config({ path: path.join(__dirname, '..', '..', '.env') });
config(); // load default .env in CWD as fallback

const apiBase = process.env.API_BASE || 'http://localhost:3001';
const periodLabel = process.env.PERIOD_LABEL;
const snapshotDate = process.env.SNAPSHOT_DATE;

async function resolveStoreId() {
  const envStore = process.env.STORE_ID || process.env.NEXT_PUBLIC_STORE_ID;
  if (envStore) return envStore;

  // fallback: fetch default store from API
  const res = await fetch(`${apiBase}/stores/default`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Missing STORE_ID and failed to fetch /stores/default: ${res.status} ${res.statusText} ${text}`
    );
  }
  const store = (await res.json()) as { id?: string };
  if (!store?.id) {
    throw new Error('Missing STORE_ID and /stores/default did not return an id');
  }
  return store.id;
}

async function main() {
  const storeId = await resolveStoreId();

  const kpiUrl = `${apiBase}/kpis?storeId=${encodeURIComponent(storeId)}`;
  const kpiRes = await fetch(kpiUrl);
  if (!kpiRes.ok) {
    const text = await kpiRes.text();
    throw new Error(`Failed to fetch KPIs: ${kpiRes.status} ${kpiRes.statusText} ${text}`);
  }
  const kpis = await kpiRes.json();

  const snapshotPayload: any = {
    storeId,
    kpis,
  };
  if (periodLabel) snapshotPayload.periodLabel = periodLabel;
  if (snapshotDate) snapshotPayload.date = snapshotDate;

  const snapRes = await fetch(`${apiBase}/integrations/kpi-snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshotPayload),
  });

  if (!snapRes.ok) {
    const text = await snapRes.text();
    throw new Error(`Failed to push KPI snapshot: ${snapRes.status} ${snapRes.statusText} ${text}`);
  }

  const result = await snapRes.json();
  console.log('Snapshot created:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
