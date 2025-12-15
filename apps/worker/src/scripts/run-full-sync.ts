import "dotenv/config";
import { prisma } from "../db";
import { syncStore } from "../sync/sync-store";

async function main() {
  const storeId = process.env.STORE_ID;
  if (!storeId) throw new Error("STORE_ID env is required");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store ${storeId} not found`);

  const result = await syncStore(store, {
    full: true,
    logger: (msg, meta) => console.log(msg, meta || ""),
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
