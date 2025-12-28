export type RewardTier = {
  points: number;
  title: string;
  source: string;
  detail: string;
};

export const rewardLadder: RewardTier[] = [
  {
    points: 150,
    title: 'Free sample pack',
    source: 'Woo product, price 0',
    detail: 'Pure Dose / Bliss Dose / Focus Dose free sample pack.',
  },
  {
    points: 300,
    title: 'Free shipping',
    source: 'Coupon: free-shipping',
    detail: 'Free shipping on next order.',
  },
  {
    points: 450,
    title: 'Free gummy',
    source: 'Coupon: freegummy',
    detail: 'Free gummy add-on on next order.',
  },
  {
    points: 700,
    title: 'Buy 2 get 1 free',
    source: 'Coupon: buy-2-gummies-and-get-1-free',
    detail: 'Existing B2G1 coupon reward.',
  },
];

export function getNextReward(points: number | null | undefined) {
  if (points == null || Number.isNaN(points)) return null;
  return rewardLadder.find((tier) => points < tier.points) ?? null;
}

export function getLastReward(points: number | null | undefined) {
  if (points == null || Number.isNaN(points)) return null;
  const eligible = rewardLadder.filter((tier) => points >= tier.points);
  return eligible.length ? eligible[eligible.length - 1] : null;
}
