import { inngest } from "./client";
import { prisma } from "../db";
import { syncStore } from "../sync/sync-store";

type SyncEvent = {
  name: "woo/store.sync";
  data: {
    storeId: string;
    full?: boolean;
    since?: string;
    reason?: string;
  };
};

type FunctionLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
};

type FunctionStep = {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  sendEvent: (stepId: string, event: SyncEvent | SyncEvent[]) => Promise<void>;
};

type FunctionContext = {
  event: { data: SyncEvent["data"] };
  step: FunctionStep;
  logger: FunctionLogger;
};

type ScheduleContext = {
  step: FunctionStep;
  logger: FunctionLogger;
};

export const syncStoreFunction = inngest.createFunction(
  { id: "sync-store", name: "Sync WooCommerce Store" },
  { event: "woo/store.sync" },
  async ({ event, step, logger }: FunctionContext) => {
    const { storeId, full, since } = event.data;
    if (!storeId) {
      throw new Error("storeId missing in event data");
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    // Default incremental window: last 2 days when not a full sync and no explicit "since".
    const sinceDate =
      since || !full
        ? new Date(since ?? Date.now() - 1000 * 60 * 60 * 24 * 2)
        : undefined;

    const result = await step.run("run-sync", () =>
      syncStore(store, {
        full: Boolean(full),
        since: sinceDate,
        logger: (message, meta) => logger.info(message, meta),
      })
    );

    return result;
  }
);

export const scheduledSyncFunction = inngest.createFunction(
  { id: "scheduled-sync", name: "Scheduled Store Sync" },
  { cron: "0 * * * *" },
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

export const functions = [syncStoreFunction, scheduledSyncFunction];
