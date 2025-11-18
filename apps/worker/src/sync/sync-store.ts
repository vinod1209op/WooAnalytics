import type { Store } from "@prisma/client";
import { createSyncContext } from "./context";
import type { SyncStats, SyncStoreOptions } from "./types";
import { syncProducts } from "./sync-products";
import { syncCustomers } from "./sync-customers";
import { syncOrders } from "./sync-orders";
import { syncCoupons } from "./sync-coupons";
import { syncSubscriptions } from "./sync-subscriptions";
import { syncAnalytics } from "./sync-analytics";

export async function syncStore(
  store: Store,
  options: SyncStoreOptions = {}
) {
  const context = createSyncContext(store, options.logger);

  const summaries: SyncStats[] = [];

  summaries.push(await syncProducts(context));
  summaries.push(await syncCustomers(context));
  summaries.push(await syncCoupons(context));
  summaries.push(await syncSubscriptions(context));
  const orderStats = await syncOrders(context, {
    since: options.since,
    full: options.full,
  });
  summaries.push(orderStats);
  const analyticsStats = await syncAnalytics(context, {
    remoteDaily: (orderStats.meta?.remoteDaily as Record<
      string,
      { revenue: number; orders: number }
    >) ?? undefined,
  });
  summaries.push(...analyticsStats);

  return {
    storeId: store.id,
    summaries,
  };
}
