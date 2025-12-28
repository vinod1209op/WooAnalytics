import type { Customer } from "@prisma/client";
import { prisma } from "../../db";
import type { SyncContext } from "../types";
import { normalizeDate } from "./order-utils";

export async function ensureCustomer(
  ctx: SyncContext,
  order: any
): Promise<Customer | null> {
  const wooCustomerId = order.customer_id ? String(order.customer_id) : null;
  const email =
    order.billing?.email?.toLowerCase() ||
    order.customer_email?.toLowerCase() ||
    `order-${ctx.store.id}-${order.id}@wooanalytics.local`;

  const baseData = {
    storeId: ctx.store.id,
    email,
    firstName: order.billing?.first_name || null,
    lastName: order.billing?.last_name || null,
    phone: order.billing?.phone || null,
    lastActiveAt: normalizeDate(
      order.date_modified_gmt ?? order.date_completed ?? order.date_created
    ),
  };

  if (wooCustomerId) {
    return prisma.customer.upsert({
      where: {
        storeId_wooId: {
          storeId: ctx.store.id,
          wooId: wooCustomerId,
        },
      },
      update: baseData,
      create: {
        ...baseData,
        wooId: wooCustomerId,
      },
    });
  }

  const existing = await prisma.customer.findFirst({
    where: {
      storeId: ctx.store.id,
      email,
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return prisma.customer.create({
    data: baseData,
  });
}
