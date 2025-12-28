import type { Order } from "@prisma/client";
import { prisma } from "../../db";
import type { SyncContext } from "../types";
import { safeNumber } from "./order-utils";

export async function syncOrderItems(ctx: SyncContext, order: Order, items: any[]) {
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });

  for (const item of items) {
    const product =
      item.product_id &&
      (await prisma.product.findFirst({
        where: {
          storeId: ctx.store.id,
          wooId: String(item.product_id),
        },
      }));

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product?.id ?? null,
        name: item.name ?? "Line Item",
        sku: item.sku || product?.sku || null,
        quantity: Number(item.quantity ?? 1),
        unitPrice: safeNumber(item.price) ?? null,
        lineSubtotal: safeNumber(item.subtotal) ?? null,
        lineTotal: safeNumber(item.total) ?? null,
        taxTotal: safeNumber(item.total_tax) ?? null,
      },
    });
  }
}
