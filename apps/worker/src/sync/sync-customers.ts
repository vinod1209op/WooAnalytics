import type { Customer } from "@prisma/client";
import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

export async function syncCustomers(ctx: SyncContext): Promise<SyncStats> {
  const res = await ctx.client.getCustomers({ per_page: 100 });
  if (!res.success) {
    throw new Error(`Failed to load customers: ${res.error}`);
  }

  const warnings: string[] = [];
  let processed = 0;

  for (const customer of res.data ?? []) {
    try {
      const email =
        customer.email?.toLowerCase() ??
        fallbackEmail(ctx.store.id, customer.id);
      const wooId = customer.id ? String(customer.id) : null;
      const baseData = {
        firstName: customer.first_name || null,
        lastName: customer.last_name || null,
        phone: customer.billing?.phone || null,
      };

      let record: Customer | null = null;

      if (wooId) {
        record = await prisma.customer.findUnique({
          where: {
            storeId_wooId: {
              storeId: ctx.store.id,
              wooId,
            },
          },
        });
      }

      if (record) {
        const safeEmail =
          (await resolveSafeEmail(ctx.store.id, record.id, email)) ?? record.email;
        record = await prisma.customer.update({
          where: { id: record.id },
          data: { ...baseData, email: safeEmail },
        });
      } else {
        const existing = await prisma.customer.findFirst({
          where: {
            storeId: ctx.store.id,
            email,
          },
        });

        if (existing) {
          record = await prisma.customer.update({
            where: { id: existing.id },
            data: {
              ...baseData,
              ...(wooId && !existing.wooId ? { wooId } : {}),
            },
          });
        } else {
          record = await prisma.customer.create({
            data: {
              storeId: ctx.store.id,
              wooId,
              email,
              ...baseData,
            },
          });
        }
      }

      if (record && customer.date_last_order) {
        await prisma.customer.update({
          where: { id: record.id },
          data: {
            lastActiveAt: new Date(customer.date_last_order),
          },
        });
      }

      processed++;
      renderProgress("Customers", processed);
    } catch (err: any) {
      warnings.push(err?.message ?? "Unknown error syncing customer");
    }
  }

  finishProgress();
  ctx.logger("Customers synced", { processed, warnings: warnings.length });

  return { entity: "customers", processed, warnings };
}

function fallbackEmail(storeId: string, id?: number | string) {
  return `guest-${storeId}-${id ?? Date.now()}@wooanalytics.local`;
}

async function resolveSafeEmail(storeId: string, id: number, email: string) {
  const conflict = await prisma.customer.findFirst({
    where: {
      storeId,
      email,
      NOT: { id },
    },
    select: { id: true },
  });
  return conflict ? null : email;
}

function renderProgress(label: string, count: number) {
  if (process.stdout?.write) {
    process.stdout.write(`\r${label} processed: ${count.toString().padEnd(8, " ")}`);
  }
}

function finishProgress() {
  if (process.stdout?.write) {
    process.stdout.write("\n");
  }
}
