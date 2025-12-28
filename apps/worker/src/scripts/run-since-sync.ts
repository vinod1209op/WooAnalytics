import "dotenv/config";
import { prisma } from "../db";
import { syncStore } from "../sync/sync-store";

function parseDays(args: string[], fallback = 7) {
  const arg = args.find((value) => value.startsWith("--days="));
  if (!arg) return fallback;
  const raw = Number(arg.split("=")[1]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.floor(raw);
}

function parseStoreId(args: string[]) {
  const arg = args.find((value) => value.startsWith("--storeId="));
  return arg ? arg.split("=")[1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const days = parseDays(args, 7);
  const storeId = parseStoreId(args) ?? process.env.STORE_ID;
  if (!storeId) throw new Error("STORE_ID env is required");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store ${storeId} not found`);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await syncStore(store, {
    since,
    logger: (msg, meta) => console.log(msg, meta || ""),
  });

  console.log(JSON.stringify({ days, since: since.toISOString(), ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
