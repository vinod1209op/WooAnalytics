import path from "path";
import { config } from "dotenv";
import { fetchContact, searchContacts, upsertContactWithTags } from "../lib/ghl";

config({ path: path.resolve(__dirname, "..", "..", ".env") });

const INTENT_TAGS = [
  "intent_stress",
  "intent_creativity_focus",
  "intent_mood_brainfog",
  "intent_growth",
  "intent_energy",
  "intent_unsure",
  "intent_other",
];

const MH_TAGS = [
  "mh_trauma_recovery",
  "mh_spiritual_growth",
  "mh_low_productivity",
  "mh_high_stress_depression",
];

const IMPROVE_TAGS = [
  "improve_emotional_balance",
  "improve_cognitive_performance",
  "improve_physical_wellbeing",
  "improve_spiritual_growth",
];

const SAFETY_TAGS = [
  "med_ssri",
  "med_lithium",
  "cond_high_bp",
  "cond_epilepsy",
  "cond_recent_stroke",
  "bipolar_yes",
  "bipolar_no",
  "bipolar_unsure",
  "needs_medical_clearance",
];

const REMOVE_TAGS = new Set([...INTENT_TAGS, ...MH_TAGS, ...IMPROVE_TAGS, ...SAFETY_TAGS]);

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (key: string, fallback?: string) => {
    const match = args.find((a) => a.startsWith(`--${key}=`));
    return match ? match.split("=")[1] : fallback;
  };
  const limit = Number(get("limit", process.env.LIMIT || "50")) || 50;
  const tagFilter = get("tag", process.env.TAG_FILTER || "quiz submitted") || "quiz submitted";
  const locationId = get("locationId", process.env.GHL_LOCATION_ID);
  if (!locationId) throw new Error("locationId is required (--locationId or GHL_LOCATION_ID env)");
  return { limit: Math.max(1, limit), tagFilter, locationId };
}

async function main() {
  const { limit, tagFilter, locationId } = parseArgs();
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing in env");

  const processedIds: string[] = [];
  let page = 1;
  while (processedIds.length < limit) {
    const batch = await searchContacts({
      locationId,
      tag: tagFilter,
      page,
      pageLimit: Math.min(50, limit - processedIds.length),
    });
    if (!batch.contacts?.length) break;

    for (const c of batch.contacts) {
      if (processedIds.length >= limit) break;
      const full = await fetchContact(c.id);
      const currentTags = full.tags || [];
      const filtered = currentTags.filter((t) => !REMOVE_TAGS.has(t));
      if (filtered.length === currentTags.length) {
        processedIds.push(c.id);
        continue;
      }
      await upsertContactWithTags({
        contactId: c.id,
        locationId,
        email: full.email,
        phone: full.phone,
        firstName: full.firstName,
        lastName: full.lastName,
        tags: filtered,
      });
      processedIds.push(c.id);
      console.log(`Cleaned tags for ${full.email || full.id}`);
    }

    if (!batch.nextPage || !batch.contacts.length) break;
    page = batch.nextPage;
  }

  console.log(
    JSON.stringify(
      {
        removedTags: Array.from(REMOVE_TAGS),
        processed: processedIds.length,
        processedIds,
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
