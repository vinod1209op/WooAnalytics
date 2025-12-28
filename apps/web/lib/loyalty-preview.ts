import { rewardLadder } from './loyalty';

export const previewCustomer = {
  name: 'Loyalty member',
  points: 220,
  nextRewardAt: 300,
  level: 'Level 2',
  lastEarned: 'Order $112 -> +112 points',
  nextRewardLabel: 'Free shipping',
};

export const highlights = [
  {
    title: 'No % discounts',
    detail: 'Rewards come from existing free products + coupons.',
  },
  {
    title: 'Micro moments',
    detail: 'Animated points + progress bar keeps momentum visible.',
  },
  {
    title: 'Behavior first',
    detail: 'Earn for repeat orders, quiz completion, and streaks.',
  },
];

export const loopSteps = [
  { title: 'Earn', detail: 'Purchases, quiz, repeat orders' },
  { title: 'Track', detail: 'Points balance + next reward' },
  { title: 'Unlock', detail: 'Free products or free shipping' },
  { title: 'Celebrate', detail: 'Simple email/SMS moments' },
];

export const earnRules = [
  { label: 'Purchases', detail: '$1 spent = 1 point (Woo totals).' },
  { label: 'Quiz completion', detail: '+60 points one-time (workflow bonus).' },
  { label: 'Repeat order', detail: '2nd order in 45 days -> +120 points.' },
  { label: 'Momentum', detail: '3rd order in 45 days -> +200 points.' },
];

export const streakIdeas = [
  { label: 'Streak bonus', detail: 'Keep streak alive by ordering within 45 days.' },
  { label: 'Streak rescue', detail: '1 grace reminder before streak resets.' },
  { label: 'Double points weekend', detail: 'Limited-time tag-driven booster.' },
];

export const rewardVault = [
  'Pure Dose Free Sample Pack - 10 Capsules',
  'Bliss Dose Free Sample Pack - 10 Capsules',
  'Focus Dose Free Sample Pack - 10 Capsules',
  'Influencer Box',
  'Coupon: free-shipping',
  'Coupon: freegummy',
  'Coupon: buy-2-gummies-and-get-1-free',
  'Coupon: spend-200-get-3-free-gummies',
];

export const messageIdeas = [
  {
    title: 'Unlocked reward',
    body: 'You just unlocked a free sample pack. Pick your favorite.',
    channel: 'Email + SMS',
  },
  {
    title: 'Close to reward',
    body: 'You are 10 points away from free shipping.',
    channel: 'SMS, cooldown 10 days',
  },
  {
    title: 'Streak bonus',
    body: 'Nice streak! You earned +120 bonus points.',
    channel: 'Email',
  },
];

export const surfaces = [
  'Customer profile: points bar + next reward',
  'Order confirmation: points earned recap',
  'Post-purchase email: how close to next reward',
  'GHL contact: points fields + reward tags',
];

export const interactionPlaybook = [
  '10 points away: add loyalty_nudge_email tag (email workflow).',
  'Reward unlocked: add loyalty_reward_unlocked tag (celebration flow).',
  'Idle 45 days: add loyalty_nudge_sms tag (winback flow).',
];

export const ideaBank = [
  {
    title: 'Collect all samples',
    detail: 'Try all 3 free sample packs to unlock Influencer Box.',
  },
  {
    title: 'Choose your reward',
    detail: 'Let customer pick from the free sample packs list.',
  },
  {
    title: 'Mystery reward',
    detail: 'Random free sample pack when they hit a tier.',
  },
  {
    title: 'Comeback boost',
    detail: 'After 60 days idle, reward free shipping on return.',
  },
  {
    title: 'Bundle quest',
    detail: 'Unlock buy-2-get-1 coupon after 2 orders in 30 days.',
  },
  {
    title: 'Momentum badge',
    detail: 'Tag + badge when they place 2 orders in 45 days.',
  },
];

export { rewardLadder };
