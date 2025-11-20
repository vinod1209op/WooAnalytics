import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

export async function syncCoupons(ctx: SyncContext): Promise<SyncStats> {
  const res = await ctx.client.getCoupons({ per_page: 100 });
  if (!res.success) {
    throw new Error(`Failed to load coupons: ${res.error}`);
  }

  const warnings: string[] = [];
  let processed = 0;

  for (const coupon of res.data ?? []) {
    try {
      const wooId = coupon.id ? String(coupon.id) : null;
      const code = coupon.code ?? wooId;
      if (!code) {
        warnings.push("Coupon without code");
        continue;
      }

      await prisma.coupon.upsert({
        where: {
          storeId_code: {
            storeId: ctx.store.id,
            code,
          },
        },
        update: {
          wooId,
          discountType: coupon.discount_type ?? null,
          amount: Number(coupon.amount ?? 0),
          dateExpires: coupon.date_expires ? new Date(coupon.date_expires) : null,
          usageLimit: coupon.usage_limit ?? null,
          usageCount: coupon.usage_count ?? null,
        },
        create: {
          storeId: ctx.store.id,
          wooId,
          code,
          discountType: coupon.discount_type ?? null,
          amount: Number(coupon.amount ?? 0),
          dateExpires: coupon.date_expires ? new Date(coupon.date_expires) : null,
          usageLimit: coupon.usage_limit ?? null,
          usageCount: coupon.usage_count ?? null,
        },
      });
      processed++;
      renderProgress("Coupons", processed);
    } catch (err: any) {
      warnings.push(err?.message ?? "Unknown coupon error");
    }
  }

  finishProgress();
  ctx.logger("Coupons synced", { processed, warnings: warnings.length });

  return { entity: "coupons", processed, warnings };
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
