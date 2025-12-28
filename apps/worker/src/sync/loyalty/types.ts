export type GhlFieldDef = {
  id: string;
  name?: string;
  fieldKey?: string;
};

export type GhlContact = {
  id: string;
  email?: string | null;
  customFields?: Array<{ id: string; value: any }>;
};

export type LoyaltyStats = {
  pointsBalance: number | null;
  pointsLifetime: number | null;
  pointsToNext: number | null;
  nextRewardAt: number | null;
  lastRewardAt: number | null;
  tier: string | null;
};
