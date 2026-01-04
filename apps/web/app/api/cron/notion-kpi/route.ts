"use server";

import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET;
const ANALYTICS_TZ = process.env.ANALYTICS_TIMEZONE || "America/Los_Angeles";

function formatYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type TopListItem = {
  name?: string | null;
  revenue?: number | null;
  units?: number | null;
};

type SegmentItem = {
  segment?: string | null;
  customers?: number | null;
};

type NewVsReturningPoint = {
  newOrders?: number | null;
  returningOrders?: number | null;
  newCustomers?: number | null;
  returningCustomers?: number | null;
  repeatRate?: number | null;
};

function formatTopList(items: TopListItem[] | undefined) {
  if (!items?.length) return undefined;
  const formatted = items.slice(0, 5).map((item) => {
    const name = item.name?.trim() || "Unknown";
    const details: string[] = [];
    if (typeof item.revenue === "number") {
      details.push(`$${item.revenue.toFixed(2)}`);
    }
    if (typeof item.units === "number") {
      details.push(`${item.units} units`);
    }
    return details.length ? `${name} (${details.join(", ")})` : name;
  });
  return formatted.join(" | ");
}

function formatSegmentCounts(segments: SegmentItem[] | undefined) {
  if (!segments?.length) return undefined;
  const formatted = segments.map((segment) => {
    const name = segment.segment?.trim() || "Unknown";
    const count = typeof segment.customers === "number" ? segment.customers : 0;
    return `${name}: ${count}`;
  });
  return formatted.join(" | ");
}

function summarizeNewVsReturning(points: NewVsReturningPoint[] | undefined) {
  if (!points?.length) return null;
  let newOrders = 0;
  let returningOrders = 0;
  let weightedRepeat = 0;
  let repeatWeight = 0;

  for (const point of points) {
    const newOrdersValue = Number(point.newOrders ?? 0);
    const returningOrdersValue = Number(point.returningOrders ?? 0);
    newOrders += newOrdersValue;
    returningOrders += returningOrdersValue;

    const newCustomers = Number(point.newCustomers ?? 0);
    const returningCustomers = Number(point.returningCustomers ?? 0);
    const totalCustomers = newCustomers + returningCustomers;
    if (totalCustomers > 0 && typeof point.repeatRate === "number") {
      weightedRepeat += point.repeatRate * totalCustomers;
      repeatWeight += totalCustomers;
    }
  }

  const repeatRate =
    repeatWeight > 0
      ? Math.round((weightedRepeat / repeatWeight) * 100) / 100
      : undefined;

  return {
    newOrders,
    returningOrders,
    repeatRate,
  };
}

function buildPeriodRanges() {
  const today = new Date();
  const to = formatYmd(today);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekFrom = formatYmd(weekStart);

  const rollingStart = new Date(today);
  rollingStart.setDate(rollingStart.getDate() - 29);
  const monthFrom = formatYmd(rollingStart);

  return [
    {
      key: "weekly",
      label: `Weekly (${weekFrom} → ${to})`,
      from: weekFrom,
      to,
      snapshotDate: to,
    },
    {
      key: "monthly",
      label: `Rolling 30 days (${monthFrom} → ${to})`,
      from: monthFrom,
      to,
      snapshotDate: to,
    },
  ];
}

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
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    if (CRON_SECRET) {
      const auth = req.headers.get("authorization");
      const cronHeader = req.headers.get("x-vercel-cron");
      const { searchParams } = new URL(req.url);
      const querySecret = searchParams.get("cronSecret");
      const authorized =
        auth === `Bearer ${CRON_SECRET}` ||
        querySecret === CRON_SECRET ||
        cronHeader === "1";
      if (!authorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get("storeId");
    const storeId = storeIdParam || (await resolveStoreId());
    const ranges = buildPeriodRanges();

    const snapshots = await Promise.all(
      ranges.map(async (range) => {
        const kpiUrl = new URL(`${API_BASE}/kpis`);
        kpiUrl.searchParams.set("storeId", storeId);
        kpiUrl.searchParams.set("from", range.from);
        kpiUrl.searchParams.set("to", range.to);

        const kpiRes = await fetch(kpiUrl.toString(), { cache: "no-store" });
        if (!kpiRes.ok) {
          const text = await kpiRes.text();
          throw new Error(
            `Failed to fetch KPIs (${range.key}): ${kpiRes.status} ${kpiRes.statusText} ${text}`
          );
        }
        const kpis = await kpiRes.json();

        let leadSummary: any = null;
        try {
          const leadUrl = new URL(`${API_BASE}/analytics/lead-coupons`);
          leadUrl.searchParams.set("storeId", storeId);
          leadUrl.searchParams.set("from", range.from);
          leadUrl.searchParams.set("to", range.to);
          const leadRes = await fetch(leadUrl.toString(), { cache: "no-store" });
          if (leadRes.ok) {
            leadSummary = await leadRes.json();
          }
        } catch (err) {
          console.warn("Lead coupon summary fetch failed", err);
        }

        let newVsSummary: any = null;
        try {
          const newVsUrl = new URL(`${API_BASE}/analytics/new-vs-returning`);
          newVsUrl.searchParams.set("storeId", storeId);
          newVsUrl.searchParams.set("from", range.from);
          newVsUrl.searchParams.set("to", range.to);
          const newVsRes = await fetch(newVsUrl.toString(), { cache: "no-store" });
          if (newVsRes.ok) {
            newVsSummary = await newVsRes.json();
          }
        } catch (err) {
          console.warn("New vs returning fetch failed", err);
        }

        let topProductsSummary: any = null;
        try {
          const topProductsUrl = new URL(`${API_BASE}/analytics/products/top`);
          topProductsUrl.searchParams.set("storeId", storeId);
          topProductsUrl.searchParams.set("from", range.from);
          topProductsUrl.searchParams.set("to", range.to);
          const topProductsRes = await fetch(topProductsUrl.toString(), { cache: "no-store" });
          if (topProductsRes.ok) {
            topProductsSummary = await topProductsRes.json();
          }
        } catch (err) {
          console.warn("Top products fetch failed", err);
        }

        let topCategoriesSummary: any = null;
        try {
          const topCategoriesUrl = new URL(`${API_BASE}/categories/top`);
          topCategoriesUrl.searchParams.set("storeId", storeId);
          topCategoriesUrl.searchParams.set("from", range.from);
          topCategoriesUrl.searchParams.set("to", range.to);
          const topCategoriesRes = await fetch(topCategoriesUrl.toString(), { cache: "no-store" });
          if (topCategoriesRes.ok) {
            topCategoriesSummary = await topCategoriesRes.json();
          }
        } catch (err) {
          console.warn("Top categories fetch failed", err);
        }

        let segmentSummary: any = null;
        try {
          const segmentsUrl = new URL(`${API_BASE}/segments`);
          segmentsUrl.searchParams.set("storeId", storeId);
          segmentsUrl.searchParams.set("from", range.from);
          segmentsUrl.searchParams.set("to", range.to);
          const segmentsRes = await fetch(segmentsUrl.toString(), { cache: "no-store" });
          if (segmentsRes.ok) {
            segmentSummary = await segmentsRes.json();
          }
        } catch (err) {
          console.warn("Segments fetch failed", err);
        }

        const leadStats = leadSummary?.summary ?? null;
        const newVsTotals = summarizeNewVsReturning(newVsSummary?.points);
        const topProductsText = formatTopList(
          (topProductsSummary?.products as TopListItem[] | undefined) ?? undefined
        );
        const topCategoriesText = formatTopList(
          (Array.isArray(topCategoriesSummary) ? topCategoriesSummary : undefined) as
            | TopListItem[]
            | undefined
        );
        const segmentCountsText = formatSegmentCounts(
          (segmentSummary?.segments as SegmentItem[] | undefined) ?? undefined
        );
        const enrichedKpis = {
          ...kpis,
          leadCouponsCreated: leadStats?.generated ?? undefined,
          leadCouponsRedeemed: leadStats?.redeemed ?? undefined,
          leadCouponUses: leadStats?.redeemedUses ?? undefined,
          leadCouponOrders: leadStats?.ordersUsing ?? undefined,
          leadCouponRedemptionRate: leadStats?.redemptionRate ?? kpis?.leadCouponRedemptionRate,
          newOrders: newVsTotals?.newOrders ?? undefined,
          returningOrders: newVsTotals?.returningOrders ?? undefined,
          repeatRate: newVsTotals?.repeatRate ?? undefined,
          topProducts: topProductsText,
          topCategories: topCategoriesText,
          segmentCounts: segmentCountsText,
        };

        const snapshotRes = await fetch(`${API_BASE}/integrations/kpi-snapshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            periodLabel: range.label,
            date: range.snapshotDate,
            kpis: enrichedKpis,
          }),
        });

        if (!snapshotRes.ok) {
          const text = await snapshotRes.text();
          throw new Error(
            `Failed to push KPI snapshot (${range.key}): ${snapshotRes.status} ${snapshotRes.statusText} ${text}`
          );
        }

        const result = await snapshotRes.json();
        return { period: range.key, snapshot: result };
      })
    );

    const finishedAt = new Date().toISOString();
    console.log("notion-kpi cron success", {
      runId,
      startedAt,
      finishedAt,
      storeId,
      ranges: ranges.map((range) => range.key),
    });

    return NextResponse.json({ ok: true, runId, startedAt, finishedAt, snapshots });
  } catch (err: unknown) {
    console.error("cron/notion-kpi error:", err);
    const message = err instanceof Error ? err.message : "Snapshot failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
