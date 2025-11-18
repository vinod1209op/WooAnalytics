import type { Store } from "@prisma/client";
import type { WooCommerceClient } from "../woo/client";

export type LoggerFn = (
  message: string,
  meta?: Record<string, unknown>
) => void;

export interface SyncContext {
  store: Store;
  client: WooCommerceClient;
  logger: LoggerFn;
}

export interface SyncStats {
  entity:
    | "products"
    | "customers"
    | "orders"
    | "coupons"
    | "subscriptions"
    | "analytics";
  processed: number;
  warnings: string[];
  meta?: Record<string, unknown>;
}

export interface SyncStoreOptions {
  full?: boolean;
  since?: Date;
  logger?: LoggerFn;
}
