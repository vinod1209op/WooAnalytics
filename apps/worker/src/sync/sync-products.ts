import { prisma } from "../db";
import type { SyncContext, SyncStats } from "./types";

type WooCategory = {
  id?: number;
  name?: string;
  slug?: string;
  parent?: number;
};

export async function syncProducts(ctx: SyncContext): Promise<SyncStats> {
  const res = await ctx.client.getProducts({
    per_page: 100,
    status: "any",
  });

  if (!res.success) {
    throw new Error(`Failed to load products: ${res.error}`);
  }

  const warnings: string[] = [];
  let processed = 0;

  for (const product of res.data ?? []) {
    try {
      const wooId = String(product.id ?? "");
      if (!wooId) {
        warnings.push("Skipping product without Woo ID");
        continue;
      }

      const price = safeNumber(product.price ?? product.regular_price);
      const record = await prisma.product.upsert({
        where: {
          storeId_wooId: {
            storeId: ctx.store.id,
            wooId,
          },
        },
        update: {
          name: product.name ?? "Unnamed Product",
          sku: product.sku || null,
          price: price ?? 0,
          status: product.status ?? null,
        },
        create: {
          storeId: ctx.store.id,
          wooId,
          name: product.name ?? "Unnamed Product",
          sku: product.sku || null,
          price: price ?? 0,
          status: product.status ?? null,
        },
      });

      await syncProductCategories(ctx, record.id, product.categories ?? []);
      processed++;
      renderProgress("Products", processed);
    } catch (err: any) {
      warnings.push(err?.message ?? "Unknown error syncing product");
    }
  }

  finishProgress();
  ctx.logger("Products synced", { processed, warnings: warnings.length });

  return { entity: "products", processed, warnings };
}

async function syncProductCategories(
  ctx: SyncContext,
  productId: number,
  categories: WooCategory[]
) {
  if (!categories.length) {
    await prisma.productCategoryLink.deleteMany({ where: { productId } });
    return;
  }

  const categoryIds: number[] = [];

  for (const category of categories) {
    if (!category.id) continue;
    const wooId = String(category.id);
    const record = await findOrCreateCategory(ctx, {
      wooId,
      name: category.name ?? category.slug ?? wooId,
      slug: category.slug ?? null,
    });

    categoryIds.push(record.id);

    await prisma.productCategoryLink.upsert({
      where: {
        productId_categoryId: {
          productId,
          categoryId: record.id,
        },
      },
      update: {},
      create: {
        productId,
        categoryId: record.id,
      },
    });
  }

  await prisma.productCategoryLink.deleteMany({
    where: {
      productId,
      categoryId: { notIn: categoryIds },
    },
  });
}

async function findOrCreateCategory(
  ctx: SyncContext,
  payload: { wooId: string; name: string; slug: string | null }
) {
  let record =
    (await prisma.productCategory.findFirst({
      where: { storeId: ctx.store.id, wooId: payload.wooId },
    })) ||
    (await prisma.productCategory.findFirst({
      where: { storeId: ctx.store.id, name: payload.name },
    }));

  if (record) {
    return prisma.productCategory.update({
      where: { id: record.id },
      data: {
        name: payload.name,
        slug: payload.slug,
        wooId: payload.wooId,
      },
    });
  }

  return prisma.productCategory.create({
    data: {
      storeId: ctx.store.id,
      wooId: payload.wooId,
      name: payload.name,
      slug: payload.slug,
    },
  });
}

function safeNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
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
