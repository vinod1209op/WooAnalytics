import "dotenv/config";
import { prisma } from "../db";

interface SeedInput {
  name: string;
  wooBaseUrl: string;
  wooKey: string;
  wooSecret: string;
  webhookSecret?: string;
}

async function main() {
  const [name, wooBaseUrl, wooKey, wooSecret, webhookSecret] =
    process.argv.slice(2);

  validateInput({ name, wooBaseUrl, wooKey, wooSecret });

  const result = await prisma.store.upsert({
    where: {
      wooBaseUrl,
    },
    update: {
      name,
      wooKey,
      wooSecret,
      webhookSecret: webhookSecret || null,
    },
    create: {
      name,
      wooBaseUrl,
      wooKey,
      wooSecret,
      webhookSecret: webhookSecret || null,
    },
  });

  console.log(
    `Store synced: id=${result.id} name=${result.name} url=${result.wooBaseUrl}`
  );

  await prisma.$disconnect();
}

function validateInput(input: SeedInput) {
  const missing: string[] = [];
  (Object.keys(input) as (keyof SeedInput)[]).forEach((key) => {
    if (!input[key]) missing.push(key);
  });

  if (missing.length) {
    console.error(
      "Missing required arguments:",
      missing.join(", "),
      "\nUsage: pnpm --filter @wooanalytics/worker seed:store \"Store Name\" \"https://example.com\" \"ck_xxx\" \"cs_xxx\" [webhookSecret]"
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Failed to seed store:", err);
  process.exit(1);
});
