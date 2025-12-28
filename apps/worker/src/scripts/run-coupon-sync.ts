import "dotenv/config";
import { prisma } from "../db";
import { createSyncContext } from "../sync/context";
import { syncCoupons } from "../sync/sync-coupons";

function parseStoreId(args: string[]) {
  const arg = args.find((value) => value.startsWith("--storeId="));
  return arg ? arg.split("=")[1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const storeId = parseStoreId(args) ?? process.env.STORE_ID;
  if (!storeId) throw new Error("STORE_ID env is required");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store ${storeId} not found`);

  const ctx = createSyncContext(store, (msg, meta) => console.log(msg, meta || ""));
  const result = await syncCoupons(ctx);
  console.log(JSON.stringify({ storeId, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
