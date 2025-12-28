'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { SummaryChips, type SummaryItem } from './summary-chips';

type ViewMode = 'all' | 'idle';

type HeaderProps = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  copied: boolean;
  onCopyEmails: () => void;
  exportCsvUrl: string;
  disableActions: boolean;
  metaLine: string;
  summaryItems: SummaryItem[];
  error?: string | null;
};

export function CustomersHeader({
  view,
  onViewChange,
  searchOpen,
  onToggleSearch,
  searchInput,
  onSearchInputChange,
  copied,
  onCopyEmails,
  exportCsvUrl,
  disableActions,
  metaLine,
  summaryItems,
  error,
}: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-[#d9c7f5] backdrop-blur dark:bg-purple-950/40 dark:ring-purple-900/50 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Admin</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
            Customers
          </h1>
          <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
            {view === 'all'
              ? 'All buyers (tag: customer).'
              : 'Idle customers based on order history fields.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#e8dcff] bg-white/70 p-1 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/40">
            <Button
              size="sm"
              variant={view === 'all' ? 'default' : 'ghost'}
              className="rounded-lg px-4"
              onClick={() => onViewChange('all')}
            >
              All customers
            </Button>
            <Button
              size="sm"
              variant={view === 'idle' ? 'default' : 'ghost'}
              className="rounded-lg px-4"
              onClick={() => onViewChange('idle')}
            >
              Idle customers
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {searchOpen && (
              <Input
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                placeholder="Search name or email"
                className="h-9 w-56 rounded-xl border-[#d9c7f5] bg-white text-sm text-[#5b3ba4] shadow-sm focus-visible:ring-purple-300 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-100"
              />
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              onClick={onToggleSearch}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
            onClick={onCopyEmails}
            disabled={disableActions}
          >
            {copied ? 'Copied' : 'Copy emails'}
          </Button>
          <Button
            variant="default"
            className="rounded-xl bg-[#6f4bb3] text-white hover:bg-[#5b3ba4]"
            asChild
            disabled={disableActions}
          >
            <a href={exportCsvUrl}>Export CSV</a>
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">{metaLine}</div>
      <SummaryChips items={summaryItems} />
      {error && (
        <Card className="mt-3 border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </Card>
      )}
    </div>
  );
}
