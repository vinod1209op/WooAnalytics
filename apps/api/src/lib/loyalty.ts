const REWARD_THRESHOLDS = [150, 300, 450, 700];

export type LoyaltyStats = {
  pointsBalance: number | null;
  pointsLifetime: number | null;
  pointsToNext: number | null;
  nextRewardAt: number | null;
  lastRewardAt: number | null;
  tier: string | null;
};

export function buildLoyaltyStats(totalSpend: number | null | undefined): LoyaltyStats {
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

  for (const threshold of REWARD_THRESHOLDS) {
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
