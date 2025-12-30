import "dotenv/config";
import { prisma } from "../db";

function parseStoreId(args: string[]) {
  const arg = args.find((value) => value.startsWith("--storeId="));
  return arg ? arg.split("=")[1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const storeId = parseStoreId(args) ?? process.env.STORE_ID;
  if (!storeId) throw new Error("STORE_ID env is required");

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      customerId: null,
      billingEmail: { not: null },
    },
    select: { id: true, billingEmail: true },
  });

  const emails = Array.from(
    new Set(
      orders
        .map((order) => order.billingEmail?.toLowerCase())
        .filter(Boolean) as string[]
    )
  );

  if (!orders.length || !emails.length) {
    console.log(
      JSON.stringify(
        {
          storeId,
          ordersScanned: orders.length,
          matched: 0,
          updated: 0,
          skippedNoMatch: orders.length,
        },
        null,
        2
      )
    );
    return;
  }

  const customers = await prisma.customer.findMany({
    where: { storeId, email: { in: emails } },
    select: { id: true, email: true },
  });
  const customerByEmail = new Map(
    customers.map((row) => [row.email.toLowerCase(), row.id])
  );

  let matched = 0;
  let updated = 0;
  let skippedNoMatch = 0;

  for (const order of orders) {
    const email = order.billingEmail?.toLowerCase();
    if (!email) {
      skippedNoMatch += 1;
      continue;
    }
    const customerId = customerByEmail.get(email);
    if (!customerId) {
      skippedNoMatch += 1;
      continue;
    }
    matched += 1;
    await prisma.order.update({
      where: { id: order.id },
      data: { customerId },
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        storeId,
        ordersScanned: orders.length,
        matched,
        updated,
        skippedNoMatch,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
