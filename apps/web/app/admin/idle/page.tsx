'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGhlCustomers } from '@/hooks/useGhlCustomers';
import { useGhlIdleCustomers } from '@/hooks/useGhlIdleCustomers';
import { useStore } from '@/providers/store-provider';
import { Card } from '@/components/ui/card';
import { CustomerTable } from '@/components/admin/idle/customer-table';
import { IdleCustomerTable } from '@/components/admin/idle/idle-customer-table';
import { IdleFilters } from '@/components/admin/idle/filters';
import { AllCustomerFilters } from '@/components/admin/idle/all-filters';
import { SegmentCards } from '@/components/admin/idle/segment-cards';
import { CustomersHeader } from '@/components/admin/idle/customers-header';
import { PaginationControls } from '@/components/admin/idle/pagination';
import { formatDate, formatMoney } from '@/lib/formatters';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3001';

type ViewMode = 'all' | 'idle';

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter(
    (val): val is number => typeof val === 'number' && !Number.isNaN(val)
  );
  if (!filtered.length) return null;
  return filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
}

function latestDate(values: Array<string | null | undefined>) {
  let latest: string | null = null;
  let latestTs = -Infinity;
  values.forEach((value) => {
    if (!value) return;
    const ts = new Date(value).getTime();
    if (!Number.isNaN(ts) && ts > latestTs) {
      latestTs = ts;
      latest = value;
    }
  });
  return latest;
}

function minValue(values: Array<number | null | undefined>) {
  const filtered = values.filter(
    (val): val is number => typeof val === 'number' && !Number.isNaN(val)
  );
  if (!filtered.length) return null;
  return Math.min(...filtered);
}

export default function IdleCustomersPage() {
  const { store } = useStore();
  const storeId = store?.id;
  const tag = 'customer';
  const limit = 50;

  const [view, setView] = useState<ViewMode>('all');
  const [allPage, setAllPage] = useState(1);
  const [idlePage, setIdlePage] = useState(1);
  const [idleDays, setIdleDays] = useState(30);
  const [idleSegment, setIdleSegment] = useState<string | null>(null);
  const [idleIntent, setIdleIntent] = useState<string | null>(null);
  const [idleImprovement, setIdleImprovement] = useState<string | null>(null);
  const [idleCategory, setIdleCategory] = useState<string | null>(null);
  const [idleMinOrders, setIdleMinOrders] = useState<number | null>(null);
  const [idleMinSpend, setIdleMinSpend] = useState<number | null>(null);
  const [allJoinedDays, setAllJoinedDays] = useState<number | null>(null);
  const [allActiveDays, setAllActiveDays] = useState<number | null>(null);
  const [allMinOrders, setAllMinOrders] = useState<number | null>(null);
  const [allMinSpend, setAllMinSpend] = useState<number | null>(null);
  const [allIntent, setAllIntent] = useState<string | null>(null);
  const [allImprovement, setAllImprovement] = useState<string | null>(null);
  const [allCategory, setAllCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [copied, setCopied] = useState(false);
  const { data: allData, loading: allLoading, error: allError } = useGhlCustomers({
    tag,
    page: allPage,
    limit,
    query: searchQuery || undefined,
    minOrders: allMinOrders,
    minSpend: allMinSpend,
    joinedDays: allJoinedDays,
    activeDays: allActiveDays,
    intent: allIntent,
    improvement: allImprovement,
    category: allCategory,
  });

  const { data: idleData, loading: idleLoading, error: idleError } = useGhlIdleCustomers({
    tag,
    storeId,
    days: idleDays,
    page: idlePage,
    limit,
    segment: idleSegment,
    intent: idleIntent,
    improvement: idleImprovement,
    category: idleCategory,
    minOrders: idleMinOrders,
    minSpend: idleMinSpend,
    query: searchQuery || undefined,
  });

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleViewChange = (nextView: ViewMode) => {
    setView(nextView);
    if (nextView === 'all') {
      setAllPage(1);
    } else {
      setIdlePage(1);
    }
  };

  const handleToggleSearch = () => {
    setSearchOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSearchInput('');
        setSearchQuery('');
        if (view === 'all') {
          setAllPage(1);
        } else {
          setIdlePage(1);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => {
      const nextQuery = searchInput.trim();
      setSearchQuery(nextQuery);
      if (view === 'all') {
        setAllPage(1);
      } else {
        setIdlePage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchOpen, view]);

  const allCsvUrl = useMemo(() => {
    const params = new URLSearchParams({
      tag,
      page: String(allPage),
      limit: String(limit),
      format: 'csv',
    });
    if (storeId) params.set('storeId', storeId);
    if (allJoinedDays != null) params.set('joinedAfterDays', String(allJoinedDays));
    if (allActiveDays != null) params.set('activeAfterDays', String(allActiveDays));
    if (allMinOrders != null) params.set('minOrders', String(allMinOrders));
    if (allMinSpend != null) params.set('minSpend', String(allMinSpend));
    if (allIntent) params.set('intent', allIntent);
    if (allImprovement) params.set('improvement', allImprovement);
    if (allCategory) params.set('category', allCategory);
    return `${API_BASE}/customers/ghl?${params.toString()}`;
  }, [
    storeId,
    tag,
    allPage,
    limit,
    allJoinedDays,
    allActiveDays,
    allMinOrders,
    allMinSpend,
    allIntent,
    allImprovement,
    allCategory,
  ]);

  const idleCsvUrl = useMemo(() => {
    const params = new URLSearchParams({
      tag,
      days: String(idleDays),
      page: String(idlePage),
      limit: String(limit),
      format: 'csv',
    });
    if (idleSegment) params.set('segment', idleSegment);
    if (idleIntent) params.set('intent', idleIntent);
    if (idleImprovement) params.set('improvement', idleImprovement);
    if (idleCategory) params.set('category', idleCategory);
    if (idleMinOrders != null) params.set('minOrders', String(idleMinOrders));
    if (idleMinSpend != null) params.set('minSpend', String(idleMinSpend));
    return `${API_BASE}/customers/ghl-idle?${params.toString()}`;
  }, [
    tag,
    idleDays,
    idlePage,
    limit,
    idleSegment,
    idleIntent,
    idleImprovement,
    idleCategory,
    idleMinOrders,
    idleMinSpend,
  ]);

  const idleSegmentOptions = useMemo(() => {
    return Object.keys(idleData?.segmentSummary ?? {}).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [idleData?.segmentSummary]);

  const idleCategories = idleData?.categories ?? [];
  const allCategories = allData?.categories ?? [];
  const allSummary = useMemo(() => {
    const rows = allData?.data ?? [];
    return {
      avgOrders: average(rows.map((row) => row.metrics?.totalOrdersCount ?? null)),
      avgSpend: average(rows.map((row) => row.metrics?.totalSpend ?? null)),
      latestOrder: latestDate(rows.map((row) => row.metrics?.lastOrderDate ?? null)),
      latestActive: latestDate(rows.map((row) => row.dateUpdated ?? null)),
      closestReward: minValue(rows.map((row) => row.loyalty?.pointsToNext ?? null)),
    };
  }, [allData?.data]);

  const idleSummary = useMemo(() => {
    const rows = idleData?.data ?? [];
    return {
      avgDaysSince: average(
        rows.map((row) => row.metrics?.daysSinceLastOrder ?? null)
      ),
      avgRisk: average(rows.map((row) => row.churnRisk ?? null)),
      latestOrder: latestDate(rows.map((row) => row.metrics?.lastOrderDate ?? null)),
    };
  }, [idleData?.data]);

  const activeRows = view === 'all' ? allData?.data ?? [] : idleData?.data ?? [];
  const activeLoading = view === 'all' ? allLoading : idleLoading;
  const activeError = view === 'all' ? allError : idleError;
  const activePage = view === 'all' ? allPage : idlePage;
  const activeTotal = view === 'all'
    ? allData?.total ?? allData?.count ?? 0
    : idleData?.totalCount ?? idleData?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(Math.max(activeTotal, activeRows.length) / limit));

  const gotoPage = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (view === 'all') {
      setAllPage(clamped);
    } else {
      setIdlePage(clamped);
    }
  };

  const handleCopyEmails = async () => {
    const emails = activeRows
      .map((c) => c.email)
      .filter(Boolean)
      .join('\n');
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const viewLabel = view === 'all' ? 'All customers' : `Idle ${idleDays} days`;
  const summaryItems =
    view === 'all'
      ? [
          { label: 'Customers', value: activeTotal },
          {
            label: 'Avg orders',
            value: allSummary.avgOrders != null ? allSummary.avgOrders.toFixed(1) : '—',
          },
          { label: 'Avg spend', value: formatMoney(allSummary.avgSpend) },
          {
            label: 'Closest reward',
            value:
              allSummary.closestReward != null
                ? `${Math.round(allSummary.closestReward)} pts`
                : '—',
          },
          {
            label: 'Latest activity',
            value: formatDate(allSummary.latestActive ?? allSummary.latestOrder),
          },
        ]
      : [
          { label: 'Idle customers', value: activeTotal },
          {
            label: 'Avg days idle',
            value:
              idleSummary.avgDaysSince != null
                ? `${idleSummary.avgDaysSince.toFixed(1)} days`
                : '—',
          },
          {
            label: 'Avg churn risk',
            value: idleSummary.avgRisk != null ? `${idleSummary.avgRisk.toFixed(0)}/100` : '—',
          },
          {
            label: 'Latest order',
            value: formatDate(idleSummary.latestOrder),
          },
        ];

  const metaLine = `${viewLabel} • Showing ${activeRows.length} of ${activeTotal} • Page ${activePage} of ${totalPages}`;
  const exportCsvUrl = view === 'all' ? allCsvUrl : idleCsvUrl;

  return (
    <div className="space-y-6">
      <CustomersHeader
        view={view}
        onViewChange={handleViewChange}
        searchOpen={searchOpen}
        onToggleSearch={handleToggleSearch}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        copied={copied}
        onCopyEmails={handleCopyEmails}
        exportCsvUrl={exportCsvUrl}
        disableActions={!activeRows.length}
        metaLine={metaLine}
        summaryItems={summaryItems}
        error={activeError}
      />

      {view === 'all' && (
        <AllCustomerFilters
          joinedDays={allJoinedDays}
          setJoinedDays={setAllJoinedDays}
          activeDays={allActiveDays}
          setActiveDays={setAllActiveDays}
          minOrders={allMinOrders}
          setMinOrders={setAllMinOrders}
          minSpend={allMinSpend}
          setMinSpend={setAllMinSpend}
          intent={allIntent}
          setIntent={setAllIntent}
          improvement={allImprovement}
          setImprovement={setAllImprovement}
          category={allCategory}
          setCategory={setAllCategory}
          categories={allCategories}
          resetCursor={() => setAllPage(1)}
        />
      )}

      {view === 'idle' && (
        <div className="space-y-4">
          <IdleFilters
            days={idleDays}
            setDays={setIdleDays}
            intent={idleIntent}
            setIntent={setIdleIntent}
            improvement={idleImprovement}
            setImprovement={setIdleImprovement}
            segment={idleSegment}
            setSegment={setIdleSegment}
            category={idleCategory}
            setCategory={setIdleCategory}
            minOrders={idleMinOrders}
            setMinOrders={setIdleMinOrders}
            minSpend={idleMinSpend}
            setMinSpend={setIdleMinSpend}
            onCopyEmails={handleCopyEmails}
            csvUrl={idleCsvUrl}
            disableActions={!activeRows.length}
            segmentOptions={idleSegmentOptions}
            categories={idleCategories}
            resetCursor={() => setIdlePage(1)}
            showActions={false}
          />

          {idleData?.segmentSummary && Object.keys(idleData.segmentSummary).length > 0 && (
            <SegmentCards
              summary={idleData.segmentSummary}
              makeCsvUrl={(segment) => {
                const params = new URLSearchParams({
                  tag,
                  days: String(idleDays),
                  page: '1',
                  limit: String(limit),
                  format: 'csv',
                  segment,
                });
                if (idleIntent) params.set('intent', idleIntent);
                if (idleImprovement) params.set('improvement', idleImprovement);
                if (idleCategory) params.set('category', idleCategory);
                if (idleMinOrders != null) params.set('minOrders', String(idleMinOrders));
                if (idleMinSpend != null) params.set('minSpend', String(idleMinSpend));
                return `${API_BASE}/customers/ghl-idle?${params.toString()}`;
              }}
            />
          )}
        </div>
      )}

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/40">
        <div className="mt-3 overflow-auto rounded-2xl border border-[#f0e5ff] bg-white/80 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40">
          {view === 'all' ? (
            <CustomerTable rows={allData?.data ?? []} loading={allLoading} />
          ) : (
            <IdleCustomerTable rows={idleData?.data ?? []} loading={idleLoading} />
          )}
        </div>

        <PaginationControls
          key={view}
          activePage={activePage}
          totalPages={totalPages}
          activeRowsCount={activeRows.length}
          activeLoading={activeLoading}
          onPageChange={gotoPage}
        />
      </Card>
    </div>
  );
}
