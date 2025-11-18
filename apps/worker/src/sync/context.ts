import type { Store } from "@prisma/client";
import { WooCommerceClient } from "../woo/client";
import type { LoggerFn, SyncContext } from "./types";

const noopLogger: LoggerFn = () => undefined;

export function createSyncContext(
  store: Store,
  logger: LoggerFn = noopLogger
): SyncContext {
  const client = new WooCommerceClient({
    id: store.id,
    wooBaseUrl: store.wooBaseUrl,
    wooKey: store.wooKey,
    wooSecret: store.wooSecret,
  });

  return {
    store,
    client,
    logger,
  };
}
