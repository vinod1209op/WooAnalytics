"use server";

import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET;

async function resolveStoreId() {
  const res = await fetch(`${API_BASE}/stores/default`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to resolve default store: ${res.status} ${res.statusText} ${text}`
    );
  }
  const store = (await res.json()) as { id?: string };
  if (!store?.id) throw new Error("Default store did not return an id");
  return store.id;
}

export async function GET(req: Request) {
  try {
    if (CRON_SECRET) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get("storeId");
    const periodLabel = searchParams.get("periodLabel") ?? undefined;
    const snapshotDate = searchParams.get("date") ?? undefined;

    const storeId = storeIdParam || (await resolveStoreId());

    // Fetch KPIs (optionally allow from/to filters)
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const kpiUrl = new URL(`${API_BASE}/kpis`);
    kpiUrl.searchParams.set("storeId", storeId);
    if (from) kpiUrl.searchParams.set("from", from);
    if (to) kpiUrl.searchParams.set("to", to);

    const kpiRes = await fetch(kpiUrl.toString(), { cache: "no-store" });
    if (!kpiRes.ok) {
      const text = await kpiRes.text();
      throw new Error(
        `Failed to fetch KPIs: ${kpiRes.status} ${kpiRes.statusText} ${text}`
      );
    }
    const kpis = await kpiRes.json();

    // Post snapshot to API (Notion handled server-side)
    const snapshotRes = await fetch(`${API_BASE}/integrations/kpi-snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        periodLabel,
        date: snapshotDate,
        kpis,
      }),
    });

    if (!snapshotRes.ok) {
      const text = await snapshotRes.text();
      throw new Error(
        `Failed to push KPI snapshot: ${snapshotRes.status} ${snapshotRes.statusText} ${text}`
      );
    }

    const result = await snapshotRes.json();
    return NextResponse.json({ ok: true, snapshot: result });
  } catch (err: any) {
    console.error("cron/notion-kpi error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Snapshot failed" },
      { status: 500 }
    );
  }
}
