'use client';

import { useState } from 'react';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useMetaFilters } from '@/hooks/useMetaFilters';
import { FilterBar, FilterState } from '@/components/filters/filter-bar';
import { Badge } from '@/components/ui/badge';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatSuggestions } from '@/components/chat/chat-suggestions';

const suggestions = [
  'Revenue last 7 days vs previous 7',
  'Top 5 products this month',
  'Are refunds trending up?',
  'New vs returning customers last week',
  'Top categories by revenue',
];

export default function ChatPage() {
  const hasMounted = useHasMounted();
  const { categories, coupons } = useMetaFilters();
  const [filter, setFilter] = useState<FilterState>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      type: 'date',
      date: { from, to },
      category: '',
      coupon: '',
    };
  });

  const { messages, sendMessage, loading, error } = useAssistantChat();
  const [input, setInput] = useState('');

  if (!hasMounted) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage({ message: input.trim(), filters: filter });
    setInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-[#d9c7f5] backdrop-blur dark:bg-purple-950/40 dark:ring-purple-900/40 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">
                Live
              </Badge>
              <Badge
                variant="outline"
                className="border-[#d9c7f5] text-[#5b3ba4] dark:border-purple-800 dark:text-purple-100"
              >
                AI Assistant
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              Chat with your analytics
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              Ask about revenue, orders, top products, refunds, cohorts, and more.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <FilterBar filter={filter} onChange={setFilter} categories={categories} coupons={coupons} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
            Mode: {filter.type === 'date' ? 'Date range' : filter.type === 'category' ? 'Category' : 'Coupon'}
          </Badge>
          {filter.date?.from && filter.date?.to && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.date.from.toLocaleDateString()} → {filter.date.to.toLocaleDateString()}
            </Badge>
          )}
          {filter.type === 'category' && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.category ? filter.category : 'All categories'}
            </Badge>
          )}
          {filter.type === 'coupon' && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.coupon ? filter.coupon : 'All coupons'}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <MessageList messages={messages} loading={loading} error={error} />
          <ChatInput value={input} onChange={setInput} onSend={handleSend} loading={loading} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <ChatSuggestions
              items={suggestions}
              onSelect={(s) => {
                setInput(s);
                sendMessage({ message: s, filters: filter });
              }}
              disabled={loading}
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            The assistant uses your current filters (date, category, coupon) and store context to fetch real metrics from your API.
          </div>
        </div>
      </div>
    </div>
  );
}
