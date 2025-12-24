'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type FilterProps = {
  days: number;
  setDays: Dispatch<SetStateAction<number>>;
  intent: string | null;
  setIntent: Dispatch<SetStateAction<string | null>>;
  improvement: string | null;
  setImprovement: Dispatch<SetStateAction<string | null>>;
  segment: string | null;
  setSegment: Dispatch<SetStateAction<string | null>>;
  category: string | null;
  setCategory: Dispatch<SetStateAction<string | null>>;
  onCopyEmails: () => void;
  csvUrl: string;
  disableActions: boolean;
  segmentOptions: string[];
  categories: string[];
  resetCursor: () => void;
};

const DAYS_PRESETS = [30, 60, 90];
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

export function IdleFilters({
  days,
  setDays,
  intent,
  setIntent,
  improvement,
  setImprovement,
  segment,
  setSegment,
  category,
  setCategory,
  onCopyEmails,
  csvUrl,
  disableActions,
  segmentOptions,
  categories,
  resetCursor,
}: FilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(days)}
          onValueChange={(val) => {
            setDays(Number(val));
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[150px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Days" />
          </SelectTrigger>
          <SelectContent>
            {DAYS_PRESETS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Idle {d} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={segment ?? 'all'}
          onValueChange={(val) => {
            setSegment(val === 'all' ? null : val);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-[180px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            {segmentOptions.map((seg) => (
              <SelectItem key={seg} value={seg}>
                {seg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? 'Hide filters' : 'More filters'}
        </Button>

        <Button
          variant="outline"
          className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
          onClick={onCopyEmails}
          disabled={disableActions}
        >
          Copy emails
        </Button>
        <Button
          variant="default"
          className="rounded-xl bg-[#6f4bb3] text-white hover:bg-[#5b3ba4]"
          asChild
          disabled={disableActions}
        >
          <a href={csvUrl}>Export CSV</a>
        </Button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={intent ?? 'all'}
            onValueChange={(val) => {
              setIntent(val === 'all' ? null : val);
              resetCursor();
            }}
          >
            <SelectTrigger className="w-[180px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
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
            <SelectTrigger className="w-[200px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
              <SelectValue placeholder="Improvement area" />
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
            <SelectTrigger className="w-[180px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
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
        </div>
      )}
    </div>
  );
}
