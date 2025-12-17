import type { SyncContext, SyncStats } from "./types";
import { syncCohorts } from "./analytics/cohorts";
import { syncCustomerAcquisitions } from "./analytics/customer-acquisitions";
import { syncCustomerScores } from "./analytics/customer-scores";
import { syncDailySummaries } from "./analytics/daily-summaries";
import { syncReconciliation } from "./analytics/reconciliation";

interface AnalyticsOptions {
  remoteDaily?: Record<string, { revenue: number; orders: number }>;
}

export async function syncAnalytics(
  ctx: SyncContext,
  options: AnalyticsOptions = {}
): Promise<SyncStats[]> {
  const stats: SyncStats[] = [];

  stats.push(await syncDailySummaries(ctx));
  stats.push(await syncCustomerScores(ctx));
  stats.push(await syncCustomerAcquisitions(ctx));
  stats.push(await syncCohorts(ctx));

  if (options.remoteDaily) {
    stats.push(await syncReconciliation(ctx, options.remoteDaily));
  }

  return stats;
}
