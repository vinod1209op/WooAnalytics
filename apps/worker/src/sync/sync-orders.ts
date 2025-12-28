import type { SyncContext, SyncStats } from "./types";
import { upsertOrder } from "./orders/order-upsert";
import {
  finishProgress,
  renderProgress,
  trackRemote,
} from "./orders/order-utils";

interface SyncOrdersOptions {
  since?: Date;
  full?: boolean;
}

export async function syncOrders(
  ctx: SyncContext,
  options: SyncOrdersOptions = {}
): Promise<SyncStats> {
  const params: Record<string, unknown> = {
    per_page: 100,
    status: "any",
  };

  if (options.since && !options.full) {
    params.after = options.since.toISOString();
  }

  const res = await ctx.client.getOrders(params);

  if (!res.success) {
    throw new Error(`Failed to load orders: ${res.error}`);
  }

  const warnings: string[] = [];
  let processed = 0;
  const remoteDaily = new Map<
    string,
    { revenue: number; orders: number }
  >();

  for (const order of res.data ?? []) {
    try {
      await upsertOrder(ctx, order);
      trackRemote(remoteDaily, order);
      processed++;
      renderProgress("Orders", processed);
    } catch (err: any) {
      warnings.push(
        `Order ${order.id ?? "unknown"}: ${err?.message ?? "Unknown error"}`
      );
    }
  }

  finishProgress();
  ctx.logger("Orders synced", { processed, warnings: warnings.length });

  return {
    entity: "orders",
    processed,
    warnings,
    meta: {
      remoteDaily: Object.fromEntries(remoteDaily.entries()),
    },
  };
}
