'use client';

import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterProps = {
  joinedDays: number | null;
  setJoinedDays: Dispatch<SetStateAction<number | null>>;
  activeDays: number | null;
  setActiveDays: Dispatch<SetStateAction<number | null>>;
  minOrders: number | null;
  setMinOrders: Dispatch<SetStateAction<number | null>>;
  minSpend: number | null;
  setMinSpend: Dispatch<SetStateAction<number | null>>;
  intent: string | null;
  setIntent: Dispatch<SetStateAction<string | null>>;
  improvement: string | null;
  setImprovement: Dispatch<SetStateAction<string | null>>;
  category: string | null;
  setCategory: Dispatch<SetStateAction<string | null>>;
  leadCouponOnly: boolean;
  setLeadCouponOnly: Dispatch<SetStateAction<boolean>>;
  categories: string[];
  resetCursor: () => void;
};

const JOINED_OPTIONS = [
  { value: 'all', label: 'Any time', days: null },
  { value: '7', label: 'Joined last 7 days', days: 7 },
  { value: '30', label: 'Joined last 30 days', days: 30 },
  { value: '90', label: 'Joined last 90 days', days: 90 },
];

const ACTIVE_OPTIONS = [
  { value: 'all', label: 'Any activity', days: null },
  { value: '7', label: 'Active last 7 days', days: 7 },
  { value: '30', label: 'Active last 30 days', days: 30 },
  { value: '90', label: 'Active last 90 days', days: 90 },
];

const MIN_ORDER_OPTIONS = [
  { value: 'all', label: 'Any orders', count: null },
  { value: '1', label: '1+ orders', count: 1 },
  { value: '2', label: '2+ orders', count: 2 },
  { value: '5', label: '5+ orders', count: 5 },
];

const MIN_SPEND_OPTIONS = [
  { value: 'all', label: 'Any spend', amount: null },
  { value: '50', label: '$50+', amount: 50 },
  { value: '100', label: '$100+', amount: 100 },
  { value: '250', label: '$250+', amount: 250 },
  { value: '500', label: '$500+', amount: 500 },
  { value: '1000', label: '$1,000+', amount: 1000 },
];
const INTENT_OPTIONS = [
  { value: 'stress', label: 'Stress / Anxiety' },
  { value: 'creativity_focus', label: 'Creativity / Focus' },
  { value: 'mood_brainfog', label: 'Mood / Brain fog' },
  { value: 'growth', label: 'Growth' },
  { value: 'energy', label: 'Energy' },
  { value: 'unsure', label: 'Unsure / Exploring' },
  { value: 'other', label: 'Other' },
];
const IMPROVEMENT_OPTIONS = [
  { value: 'emotional_balance', label: 'Emotional balance' },
  { value: 'cognitive_performance', label: 'Cognitive performance' },
  { value: 'physical_wellbeing', label: 'Physical wellbeing' },
  { value: 'spiritual_growth', label: 'Spiritual growth' },
];

export function AllCustomerFilters({
  joinedDays,
  setJoinedDays,
  activeDays,
  setActiveDays,
  minOrders,
  setMinOrders,
  minSpend,
  setMinSpend,
  intent,
  setIntent,
  improvement,
  setImprovement,
  category,
  setCategory,
  leadCouponOnly,
  setLeadCouponOnly,
  categories,
  resetCursor,
}: FilterProps) {
  return (
    <div className="rounded-2xl border border-[#eadcff] bg-white/70 p-2 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <Select
          value={joinedDays == null ? 'all' : String(joinedDays)}
          onValueChange={(val) => {
            const option = JOINED_OPTIONS.find((item) => item.value === val);
            setJoinedDays(option?.days ?? null);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[190px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Joined" />
          </SelectTrigger>
          <SelectContent>
            {JOINED_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeDays == null ? 'all' : String(activeDays)}
          onValueChange={(val) => {
            const option = ACTIVE_OPTIONS.find((item) => item.value === val);
            setActiveDays(option?.days ?? null);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[190px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Activity" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={minOrders == null ? 'all' : String(minOrders)}
          onValueChange={(val) => {
            const option = MIN_ORDER_OPTIONS.find((item) => item.value === val);
            setMinOrders(option?.count ?? null);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[150px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Orders" />
          </SelectTrigger>
          <SelectContent>
            {MIN_ORDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={minSpend == null ? 'all' : String(minSpend)}
          onValueChange={(val) => {
            const option = MIN_SPEND_OPTIONS.find((item) => item.value === val);
            setMinSpend(option?.amount ?? null);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[160px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Spend" />
          </SelectTrigger>
          <SelectContent>
            {MIN_SPEND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={intent ?? 'all'}
          onValueChange={(val) => {
            setIntent(val === 'all' ? null : val);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[180px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intents</SelectItem>
            {INTENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={improvement ?? 'all'}
          onValueChange={(val) => {
            setImprovement(val === 'all' ? null : val);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[200px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Improvement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All improvements</SelectItem>
            {IMPROVEMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category ?? 'all'}
          onValueChange={(val) => {
            setCategory(val === 'all' ? null : val);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[180px] shrink-0 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={leadCouponOnly ? 'default' : 'outline'}
          className={`rounded-xl border-[#d9c7f5] ${
            leadCouponOnly
              ? 'bg-[#6f4bb3] text-white hover:bg-[#5b3ba4]'
              : 'text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60'
          }`}
          onClick={() => {
            setLeadCouponOnly((prev) => !prev);
            resetCursor();
          }}
        >
          Has lead coupon
        </Button>
      </div>
    </div>
  );
}
