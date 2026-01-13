import { inngest } from "./client";
import { prisma } from "../db";
import { createSyncContext } from "../sync/context";
import { syncProducts } from "../sync/sync-products";
import { syncCustomers } from "../sync/sync-customers";
import { syncOrders } from "../sync/sync-orders";
import { syncCoupons } from "../sync/sync-coupons";
import { syncSubscriptions } from "../sync/sync-subscriptions";
import { syncAnalytics } from "../sync/sync-analytics";
import { syncLoyalty } from "../sync/sync-loyalty";
import type { SyncContext } from "../sync/types";

type BaseSyncData = {
  storeId: string;
  full?: boolean;
  since?: string;
  reason?: string;
};

type AnalyticsSyncData = BaseSyncData & {
  remoteDaily?: Record<string, { revenue: number; orders: number }>;
};

type SyncEvent =
  | { name: "woo/store.sync"; data: BaseSyncData }
  | { name: "woo/store.sync.products"; data: BaseSyncData }
  | { name: "woo/store.sync.customers"; data: BaseSyncData }
  | { name: "woo/store.sync.coupons"; data: BaseSyncData }
  | { name: "woo/store.sync.subscriptions"; data: BaseSyncData }
  | { name: "woo/store.sync.orders"; data: BaseSyncData }
  | { name: "woo/store.sync.loyalty"; data: BaseSyncData }
  | { name: "woo/store.sync.analytics"; data: AnalyticsSyncData };

type FunctionLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
};

type FunctionStep = {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  sendEvent: (stepId: string, event: SyncEvent | SyncEvent[]) => Promise<void>;
};

type FunctionContext<TData> = {
  event: { data: TData };
  step: FunctionStep;
  logger: FunctionLogger;
};

type ScheduleContext = {
  step: FunctionStep;
  logger: FunctionLogger;
};

const DEFAULT_SINCE_MS = 1000 * 60 * 60 * 24 * 2;

async function loadStore(storeId: string) {
  if (!storeId) {
    throw new Error("storeId missing in event data");
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new Error(`Store ${storeId} not found`);
  }

  return store;
}

function resolveSinceDate(data: BaseSyncData) {
  if (data.since) {
    return new Date(data.since);
  }

  if (data.full) {
    return undefined;
  }

  return new Date(Date.now() - DEFAULT_SINCE_MS);
}

async function runSync<T>(
  storeId: string,
  logger: FunctionLogger,
  fn: (ctx: SyncContext) => Promise<T>
) {
  const store = await loadStore(storeId);
  const ctx = createSyncContext(store, (message, meta) => logger.info(message, meta));
  return { store, result: await fn(ctx) };
}

export const syncStoreFunction = inngest.createFunction(
  { id: "sync-store", name: "Sync WooCommerce Store (Fanout)" },
  { event: "woo/store.sync" },
  async ({ event, step, logger }: FunctionContext<BaseSyncData>) => {
    const { storeId, full, reason } = event.data;
    const store = await loadStore(storeId);

    const sinceDate = resolveSinceDate(event.data);
    const sinceIso = sinceDate ? sinceDate.toISOString() : undefined;

    const events: SyncEvent[] = [
      { name: "woo/store.sync.products", data: { storeId: store.id, reason, full, since: sinceIso } },
      { name: "woo/store.sync.customers", data: { storeId: store.id, reason, full, since: sinceIso } },
      { name: "woo/store.sync.coupons", data: { storeId: store.id, reason, full, since: sinceIso } },
      { name: "woo/store.sync.subscriptions", data: { storeId: store.id, reason, full, since: sinceIso } },
      { name: "woo/store.sync.orders", data: { storeId: store.id, reason, full, since: sinceIso } },
      { name: "woo/store.sync.loyalty", data: { storeId: store.id, reason } },
    ];

    await step.sendEvent("sync-store-fanout", events);
    logger.info("Sync fanout dispatched", {
      storeId: store.id,
      events: events.map((evt) => evt.name),
      reason,
    });

    return {
      storeId: store.id,
      triggered: events.length,
      since: sinceIso,
    };
  }
);

export const syncProductsFunction = inngest.createFunction(
  { id: "sync-products", name: "Sync Products" },
  { event: "woo/store.sync.products" },
  async ({ event, logger }: FunctionContext<BaseSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, syncProducts);
    return { storeId: store.id, summary: result };
  }
);

export const syncCustomersFunction = inngest.createFunction(
  { id: "sync-customers", name: "Sync Customers" },
  { event: "woo/store.sync.customers" },
  async ({ event, logger }: FunctionContext<BaseSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, syncCustomers);
    return { storeId: store.id, summary: result };
  }
);

export const syncCouponsFunction = inngest.createFunction(
  { id: "sync-coupons", name: "Sync Coupons" },
  { event: "woo/store.sync.coupons" },
  async ({ event, logger }: FunctionContext<BaseSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, syncCoupons);
    return { storeId: store.id, summary: result };
  }
);

export const syncSubscriptionsFunction = inngest.createFunction(
  { id: "sync-subscriptions", name: "Sync Subscriptions" },
  { event: "woo/store.sync.subscriptions" },
  async ({ event, logger }: FunctionContext<BaseSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, syncSubscriptions);
    return { storeId: store.id, summary: result };
  }
);

export const syncOrdersFunction = inngest.createFunction(
  { id: "sync-orders", name: "Sync Orders" },
  { event: "woo/store.sync.orders" },
  async ({ event, step, logger }: FunctionContext<BaseSyncData>) => {
    const sinceDate = resolveSinceDate(event.data);
    const { store, result } = await runSync(event.data.storeId, logger, (ctx) =>
      syncOrders(ctx, { since: sinceDate, full: event.data.full })
    );

    const remoteDaily = result.meta?.remoteDaily as
      | Record<string, { revenue: number; orders: number }>
      | undefined;

    if (remoteDaily && Object.keys(remoteDaily).length) {
      await step.sendEvent("sync-analytics-from-orders", {
        name: "woo/store.sync.analytics",
        data: {
          storeId: store.id,
          reason: event.data.reason,
          remoteDaily,
        },
      });
    }

    return { storeId: store.id, summary: result };
  }
);

export const syncAnalyticsFunction = inngest.createFunction(
  { id: "sync-analytics", name: "Sync Analytics" },
  { event: "woo/store.sync.analytics" },
  async ({ event, logger }: FunctionContext<AnalyticsSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, (ctx) =>
      syncAnalytics(ctx, { remoteDaily: event.data.remoteDaily })
    );
    return { storeId: store.id, summaries: result };
  }
);

export const syncLoyaltyFunction = inngest.createFunction(
  { id: "sync-loyalty", name: "Sync Loyalty" },
  { event: "woo/store.sync.loyalty" },
  async ({ event, logger }: FunctionContext<BaseSyncData>) => {
    const { store, result } = await runSync(event.data.storeId, logger, syncLoyalty);
    return { storeId: store.id, summary: result };
  }
);

export const scheduledSyncFunction = inngest.createFunction(
  { id: "scheduled-sync", name: "Scheduled Store Sync" },
  { cron: "0 8 * * *" },
  async ({ step, logger }: ScheduleContext) => {
    const stores = await prisma.store.findMany({
      select: { id: true },
    });

    if (!stores.length) {
      logger.info("No stores to sync");
      return { triggered: 0 };
    }

    const events = stores.map((store) => ({
      name: "woo/store.sync" as const,
      data: {
        storeId: store.id,
        reason: "scheduled",
      },
    }));

    await step.sendEvent("scheduled-sync-fanout", events);
    logger.info("Scheduled sync events dispatched", {
      count: stores.length,
      storeIds: stores.map((s) => s.id),
    });

    return { triggered: stores.length };
  }
);

export const functions = [
  syncStoreFunction,
  syncProductsFunction,
  syncCustomersFunction,
  syncCouponsFunction,
  syncSubscriptionsFunction,
  syncOrdersFunction,
  syncAnalyticsFunction,
  syncLoyaltyFunction,
  scheduledSyncFunction,
];
