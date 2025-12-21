import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import { normalizeFromCustomFields } from "../lib/intent-normalizer";

/**
 * Simple runtime check (no test runner needed).
 * Run with: npx ts-node apps/api/src/tests/normalize-intent.check.ts
 */
function run() {
  const fixturePath = path.join(
    __dirname,
    "fixtures",
    "ghl-contact-satish.json"
  );
  const json = JSON.parse(readFileSync(fixturePath, "utf-8"));
  const contact = json.contacts?.[0];
  assert.ok(contact, "Fixture contact missing");

  const normalized = normalizeFromCustomFields(contact.customFields || []);

  // Core intent/improvement
  assert.equal(normalized.primaryIntent, "stress");
  assert.equal(normalized.improvementArea, "cognitive_performance");

  // Tag expectations
  assert.ok(normalized.intentTags.includes("intent_stress"));
  assert.ok(normalized.intentTags.includes("improve_cognitive_performance"));

  // Integration openness
  assert.equal(normalized.messaging.integrationOpenness, "needs_guidance");
  assert.ok(normalized.messagingTags.includes("integration_needs_guidance"));

  // Safety
  assert.equal(normalized.derived.needsMedicalClearance, false);
  assert.equal(normalized.derived.contraindications.length, 0);

  // Result fields captured
  assert.ok(normalized.messaging.resultFields?.resultA2);
  assert.ok(normalized.messaging.resultFields?.resultB1);
}

if (require.main === module) {
  run();
  console.log("normalizeFromCustomFields: Satish fixture check passed");
}

export { run };
