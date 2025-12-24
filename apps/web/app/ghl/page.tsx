'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/providers/store-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoyaltyPreviewPanel } from '@/components/admin/loyalty-preview-panel';

type SyncResult = {
  processed?: number;
  matched?: number;
  tagged?: number;
  updatedDb?: number;
  skipped?: number;
  missingEmail?: number;
  errors?: Array<{ contactId?: string; email?: string; reason: string }>;
  preview?: Array<{ contactId: string; email?: string; tags?: string[] }>;
  processedIds?: Array<{ contactId: string; email?: string }>;
};

const labelClass =
  'text-xs font-semibold uppercase text-[#6f4bb3] dark:text-purple-200';
const inputClass =
  'rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50 dark:text-purple-50';

export default function GhlPage() {
  const { store, loading: storeLoading } = useStore();
  const [locationId, setLocationId] = useState('');
  const [tagQuery, setTagQuery] = useState('quiz submitted');
  const [limit, setLimit] = useState('1');
  const [dryRun, setDryRun] = useState('true');
  const [checkDrift, setCheckDrift] = useState('true');
  const [primaryIntentFieldId, setPrimaryIntentFieldId] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        locationId: locationId || undefined,
        tag: tagQuery,
        limit: Number(limit) || 1,
        dryRun: dryRun === 'true',
        checkDrift: checkDrift === 'true',
        primaryIntentFieldId: primaryIntentFieldId || undefined,
      };

      const res = await fetch('/api/cron/ghl-quiz-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Sync failed');
      }

      setResult(json);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to run GHL sync';
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Admin</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              GHL quiz sync
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              Run a quiz-tag sync against GHL and optionally write tags.
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            Store: {store?.name || '—'}
          </div>
        </div>
      </Card>

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <div className={labelClass}>Location ID (optional)</div>
            <Input
              className={inputClass}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="GHL location id"
            />
          </div>
          <div className="space-y-1">
            <div className={labelClass}>Tag / Email query</div>
            <Input
              className={inputClass}
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="quiz submitted or email"
            />
          </div>
          <div className="space-y-1">
            <div className={labelClass}>Limit</div>
            <Input
              className={inputClass}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-1">
            <div className={labelClass}>Dry run</div>
            <Select value={dryRun} onValueChange={setDryRun}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Dry run" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className={labelClass}>Check drift</div>
            <Select value={checkDrift} onValueChange={setCheckDrift}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Check drift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2 xl:col-span-3">
            <div className={labelClass}>Primary intent field ID (optional)</div>
            <Input
              className={inputClass}
              value={primaryIntentFieldId}
              onChange={(e) => setPrimaryIntentFieldId(e.target.value)}
              placeholder="GHL primary intent custom field id"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            className="rounded-xl bg-[#6f4bb3] text-white hover:bg-[#5b3ba4]"
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Running…' : 'Run sync'}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
            onClick={() => {
              setError(null);
              setResult(null);
            }}
            disabled={running}
          >
            Clear result
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div>Processed: {result.processed ?? 0}</div>
              <div>Matched: {result.matched ?? 0}</div>
              <div>Tagged: {result.tagged ?? 0}</div>
              <div>Updated DB: {result.updatedDb ?? 0}</div>
              <div>Skipped: {result.skipped ?? 0}</div>
              <div>Errors: {result.errors?.length ?? 0}</div>
            </div>

            {result.preview?.length ? (
              <div>
                <div className={labelClass}>Preview</div>
                <div className="mt-1 rounded-xl border border-[#e9d5ff] bg-white/60 p-3 text-xs text-slate-600 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-slate-200">
                  {result.preview.map((item) => (
                    <div key={item.contactId}>
                      {item.email || item.contactId} {item.tags?.length ? `(${item.tags.join(', ')})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {result.errors?.length ? (
              <div>
                <div className={labelClass}>Errors</div>
                <div className="mt-1 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {result.errors.map((err, idx) => (
                    <div key={`${err.contactId || err.email || 'err'}-${idx}`}>
                      {err.email || err.contactId || 'unknown'}: {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className={labelClass}>Loyalty preview</div>
                <div className="text-sm text-slate-500">
                  Draft view of rewards, messaging, and tiers.
                </div>
              </div>
              <span className="text-xs text-slate-400 group-open:text-slate-500">
                Toggle
              </span>
            </div>
          </summary>
          <div className="mt-4">
            <LoyaltyPreviewPanel />
          </div>
        </details>
      </Card>
    </div>
  );
}
