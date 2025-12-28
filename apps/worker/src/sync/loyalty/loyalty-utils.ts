import type { GhlFieldDef, LoyaltyStats } from "./types";

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTokens(text: string, tokens: string[]) {
  return tokens.every((token) => text.includes(token));
}

export function findFieldId(defs: GhlFieldDef[], tokenSets: string[][]) {
  for (const tokens of tokenSets) {
    const match = defs.find((def) => {
      const text = `${normalizeText(def.name)} ${normalizeText(def.fieldKey)}`;
      return matchesTokens(text, tokens);
    });
    if (match) return match.id;
  }
  return null;
}

export function extractWooId(
  customFields: Array<{ id: string; value: any }>,
  defs: GhlFieldDef[]
) {
  const wooIdFieldId = findFieldId(defs, [
    ["woo", "customer", "id"],
    ["woocommerce", "customer", "id"],
    ["woo", "id"],
    ["woocommerce", "id"],
  ]);
  if (!wooIdFieldId) return null;
  const value = customFields.find((field) => String(field.id) === wooIdFieldId)?.value;
  if (value == null || value === "") return null;
  const asString = String(value).trim();
  return asString ? asString : null;
}

export function buildLoyaltyStats(
  totalSpend: number | null | undefined,
  thresholds: number[]
): LoyaltyStats {
  if (totalSpend == null || Number.isNaN(totalSpend)) {
    return {
      pointsBalance: null,
      pointsLifetime: null,
      pointsToNext: null,
      nextRewardAt: null,
      lastRewardAt: null,
      tier: null,
    };
  }

  const points = Math.floor(totalSpend);
  let lastRewardAt: number | null = null;
  let nextRewardAt: number | null = null;

  for (const threshold of thresholds) {
    if (points >= threshold) {
      lastRewardAt = threshold;
    } else {
      nextRewardAt = threshold;
      break;
    }
  }

  return {
    pointsBalance: points,
    pointsLifetime: points,
    pointsToNext: nextRewardAt != null ? Math.max(nextRewardAt - points, 0) : null,
    nextRewardAt,
    lastRewardAt,
    tier: lastRewardAt ? `reward_unlocked_${lastRewardAt}` : null,
  };
}
