import path from "path";
import { config } from "dotenv";
import { writeFile } from "fs/promises";

config({ path: path.resolve(__dirname, "..", "..", ".env") });

type Args = {
  storeId: string;
  locationId: string;
  limit: number;
  dryRun: boolean;
  tag: string;
  apiBase: string;
  outRaw: string;
  outPretty: string;
  pretty: boolean;
  checkDrift: boolean;
  primaryIntentFieldId?: string;
};

const DEFAULTS = {
  storeId: "cmi42lm5y0000sq8n7w2t4rzn",
  locationId: "bF3HKbWR2CHUb1pETzNN",
  limit: 1,
  dryRun: true,
  tag: "quiz submitted",
  apiBase: "http://localhost:3001",
  outRaw: "ghl-quiz-sync.json",
  outPretty: "ghl-quiz-sync.pretty.json",
  pretty: true,
  checkDrift: true,
};

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (key: string, fallback?: string) => {
    const match = args.find((a) => a.startsWith(`--${key}=`));
    return match ? match.split("=").slice(1).join("=") : fallback;
  };

  const wantHelp = args.includes("--help") || args.includes("-h");
  if (wantHelp) {
    console.log(
      [
        "Usage: pnpm --filter @wooanalytics/api ts-node --transpile-only src/scripts/run-ghl-quiz-sync.ts [options]",
        "",
        "Options:",
        "  --storeId=ID                 Store id (default from env or script default)",
        "  --locationId=ID              GHL location id (default from env or script default)",
        "  --limit=N                    Max contacts to process (default 1)",
        "  --tag=QUERY                  Search query or tag (default \"quiz submitted\")",
        "  --email=ADDR                 Alias for --tag",
        "  --dryRun=true|false          Dry run mode (default true)",
        "  --apiBase=URL                API base (default http://localhost:3001)",
        "  --outRaw=FILE                Raw output file (default ghl-quiz-sync.json)",
        "  --outPretty=FILE             Pretty output file (default ghl-quiz-sync.pretty.json)",
        "  --pretty=true|false          Write pretty output file (default true)",
        "  --checkDrift=true|false      Quiz field drift check (default true)",
        "  --primaryIntentFieldId=ID    Optional GHL primary intent field id",
      ].join("\n")
    );
    process.exit(0);
  }

  const storeId = get("storeId", process.env.STORE_ID || DEFAULTS.storeId);
  const locationId = get(
    "locationId",
    process.env.GHL_LOCATION_ID || DEFAULTS.locationId
  );
  const limit = Math.max(1, Number(get("limit", String(DEFAULTS.limit))) || 1);
  let dryRun = parseBool(get("dryRun"), DEFAULTS.dryRun);
  if (args.includes("--dry-run")) dryRun = true;
  if (args.includes("--no-dry-run")) dryRun = false;

  const tag =
    get("tag") ||
    get("email") ||
    get("contact") ||
    DEFAULTS.tag;
  const apiBase =
    get("apiBase", process.env.API_BASE) || DEFAULTS.apiBase;
  const outRaw = get("outRaw", DEFAULTS.outRaw) || DEFAULTS.outRaw;
  const outPretty =
    get("outPretty", DEFAULTS.outPretty) || DEFAULTS.outPretty;
  const pretty = parseBool(get("pretty"), DEFAULTS.pretty);
  const checkDrift = parseBool(get("checkDrift"), DEFAULTS.checkDrift);
  const primaryIntentFieldId = get(
    "primaryIntentFieldId",
    process.env.GHL_PRIMARY_INTENT_FIELD_ID
  );

  if (!storeId) throw new Error("storeId is required");
  if (!locationId) throw new Error("locationId is required");
  if (!process.env.CRON_SECRET) {
    throw new Error("CRON_SECRET is required in env or apps/api/.env");
  }

  return {
    storeId,
    locationId,
    limit,
    dryRun,
    tag,
    apiBase,
    outRaw,
    outPretty,
    pretty,
    checkDrift,
    primaryIntentFieldId: primaryIntentFieldId || undefined,
  };
}

async function main() {
  const options = parseArgs();

  const payload: Record<string, unknown> = {
    storeId: options.storeId,
    locationId: options.locationId,
    limit: options.limit,
    dryRun: options.dryRun,
    tag: options.tag,
    checkDrift: options.checkDrift,
  };

  if (options.primaryIntentFieldId) {
    payload.primaryIntentFieldId = options.primaryIntentFieldId;
  }

  const res = await fetch(`${options.apiBase}/cron/sync-ghl-quiz-tags`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${text}`);
  }

  await writeFile(options.outRaw, text);
  if (options.pretty) {
    const parsed = JSON.parse(text);
    await writeFile(options.outPretty, JSON.stringify(parsed, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: options.dryRun,
        limit: options.limit,
        tag: options.tag,
        outRaw: options.outRaw,
        outPretty: options.pretty ? options.outPretty : null,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("GHL quiz sync failed:", err);
  process.exit(1);
});
