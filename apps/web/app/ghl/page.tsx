'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/providers/store-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGhlDashboard } from '@/hooks/useGhlDashboard';
import { useGhlWorkflowKpis } from '@/hooks/useGhlWorkflowKpis';

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

function fmtPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function fmtNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString();
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e9d5ff] bg-white/70 p-3 shadow-sm dark:border-purple-900/60 dark:bg-purple-950/30">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6f4bb3] dark:text-purple-200">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{hint}</div>
      ) : null}
    </div>
  );
}

export default function GhlPage() {
  const { store } = useStore();
  const [locationId, setLocationId] = useState('');
  const [tagQuery, setTagQuery] = useState('quiz submitted');
  const [limit, setLimit] = useState('1');
  const [dryRun, setDryRun] = useState('true');
  const [checkDrift, setCheckDrift] = useState('true');
  const [primaryIntentFieldId, setPrimaryIntentFieldId] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  const [dashboardDaysInput, setDashboardDaysInput] = useState('60');
  const [dashboardLocationId, setDashboardLocationId] = useState('');
  const dashboardDays = useMemo(() => {
    const parsed = Number(dashboardDaysInput);
    if (!Number.isFinite(parsed)) return 60;
    return Math.min(Math.max(Math.round(parsed), 7), 180);
  }, [dashboardDaysInput]);

  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
  } = useGhlDashboard({
    days: dashboardDays,
    locationId: dashboardLocationId || undefined,
  });
  const [slaMinutesInput, setSlaMinutesInput] = useState('30');
  const slaMinutes = useMemo(() => {
    const parsed = Number(slaMinutesInput);
    if (!Number.isFinite(parsed)) return 30;
    return Math.min(Math.max(Math.round(parsed), 1), 720);
  }, [slaMinutesInput]);
  const {
    data: workflowKpis,
    loading: workflowLoading,
    error: workflowError,
  } = useGhlWorkflowKpis(dashboardDays, slaMinutes);

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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">
              Dashboard
            </Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              GHL live metrics
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              Pulls real-time metrics from GHL conversation messages.
            </p>
          </div>
            <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <div className={labelClass}>Window (days)</div>
              <Input
                className={inputClass}
                value={dashboardDaysInput}
                onChange={(e) => setDashboardDaysInput(e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-1">
              <div className={labelClass}>Dashboard location ID (optional)</div>
              <Input
                className={inputClass}
                value={dashboardLocationId}
                onChange={(e) => setDashboardLocationId(e.target.value)}
                placeholder="uses GHL_LOCATION_ID if empty"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
          Store: {store?.name || '-'} | Location used: {dashboard?.locationId || '-'}
        </div>

        {dashboardError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {dashboardError}
          </div>
        )}

        {dashboardLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading live GHL metrics...</div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Email sent"
                value={fmtNumber(dashboard?.summary.email.sent)}
                hint={`${dashboard?.from || '-'} to ${dashboard?.to || '-'}`}
              />
              <MetricCard
                label="Email spam rate"
                value={fmtPercent(dashboard?.summary.email.spamRate)}
                hint={`Spam ${fmtNumber(dashboard?.summary.email.spam)}`}
              />
              <MetricCard
                label="Spam-folder open rate"
                value={fmtPercent(dashboard?.summary.email.spamOpenRate)}
                hint={`Spam opens ${fmtNumber(dashboard?.summary.email.spamOpens)}`}
              />
              <MetricCard
                label="Email open rate"
                value={fmtPercent(dashboard?.summary.email.openRate)}
                hint={`Opens ${fmtNumber(dashboard?.summary.email.opens)}`}
              />
              <MetricCard
                label="IG DM sent"
                value={fmtNumber(dashboard?.summary.dm.sent)}
                hint={`Replies ${fmtNumber(dashboard?.summary.dm.replies)}`}
              />
              <MetricCard
                label="DM reply rate"
                value={fmtPercent(dashboard?.summary.dm.replyRate)}
                hint={`Active days ${fmtNumber(dashboard?.summary.dm.activeDays)}`}
              />
              <MetricCard
                label="DM target"
                value={`${fmtNumber(dashboard?.summary.dm.currentTarget)}/day`}
                hint={
                  dashboard?.summary.dm.nextTarget
                    ? `Next ${dashboard.summary.dm.nextTarget}/day`
                    : 'Top checkpoint reached'
                }
              />
              <MetricCard
                label="DM max/day"
                value={fmtNumber(dashboard?.summary.dm.maxPerDay)}
                hint={`Target-met days ${fmtNumber(dashboard?.summary.dm.targetMetDays)}`}
              />
              <MetricCard
                label="IG engagement score"
                value={fmtNumber(dashboard?.summary.instagram.engagementScore)}
                hint={`DM replies + comments + likes`}
              />
              <MetricCard
                label="Messages scanned"
                value={fmtNumber(dashboard?.diagnostics.messagesScanned)}
                hint={`Pages ${fmtNumber(dashboard?.diagnostics.pagesFetched)}`}
              />
              <MetricCard
                label="GHL contacts sample"
                value={fmtNumber(dashboard?.summary.ghl.customerSampleCount)}
                hint={`Template sample ${fmtNumber(dashboard?.summary.ghl.templateSampleCount)}`}
              />
              <MetricCard
                label="Channel split"
                value={`E:${fmtNumber(dashboard?.summary.channels.email)} IG:${fmtNumber(
                  dashboard?.summary.channels.instagram
                )}`}
                hint={`SMS:${fmtNumber(dashboard?.summary.channels.sms)} Call:${fmtNumber(
                  dashboard?.summary.channels.call
                )}`}
              />
            </div>

            {dashboard?.diagnostics.warnings?.length ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="font-semibold">GHL signal warnings</div>
                <ul className="mt-2 list-disc pl-5">
                  {dashboard.diagnostics.warnings.map((warning, idx) => (
                    <li key={`${warning}-${idx}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-[#eadcff] bg-white/80 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div className={labelClass}>Message Type Breakdown</div>
                <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  {dashboard?.diagnostics.messageTypeBreakdown?.length ? (
                    dashboard.diagnostics.messageTypeBreakdown.map((row) => (
                      <div key={row.value} className="flex items-center justify-between">
                        <span>{row.value}</span>
                        <span>{row.count}</span>
                      </div>
                    ))
                  ) : (
                    <div>No message types returned.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#eadcff] bg-white/80 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div className={labelClass}>Status Breakdown</div>
                <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  {dashboard?.diagnostics.statusBreakdown?.length ? (
                    dashboard.diagnostics.statusBreakdown.map((row) => (
                      <div key={row.value} className="flex items-center justify-between">
                        <span>{row.value}</span>
                        <span>{row.count}</span>
                      </div>
                    ))
                  ) : (
                    <div>No statuses returned.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge className="bg-[#5b3ba4] text-white">Workflow KPIs</Badge>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Metrics from `POST /customers/ghl-workflow-event` stream (AI/workflow automation events).
            </div>
          </div>
          <div className="space-y-1">
            <div className={labelClass}>SLA minutes</div>
            <Input
              className={`${inputClass} w-24`}
              value={slaMinutesInput}
              onChange={(e) => setSlaMinutesInput(e.target.value)}
              placeholder="30"
            />
          </div>
        </div>

        {workflowError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {workflowError}
          </div>
        )}

        {workflowLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading workflow KPIs...</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Inbound messages"
                value={fmtNumber(workflowKpis?.engagement.inboundMessages)}
                hint={`Replied ${fmtNumber(workflowKpis?.engagement.repliedMessages)}`}
              />
              <MetricCard
                label="Response rate"
                value={fmtPercent(workflowKpis?.engagement.responseRate)}
                hint={`Within SLA ${fmtPercent(workflowKpis?.engagement.repliedWithinSlaPct)}`}
              />
              <MetricCard
                label="Avg first response"
                value={
                  workflowKpis?.engagement.averageFirstResponseMinutes != null
                    ? `${workflowKpis.engagement.averageFirstResponseMinutes.toFixed(1)}m`
                    : '-'
                }
                hint={`Hot leads ${fmtPercent(workflowKpis?.engagement.hotLeadPct)}`}
              />
              <MetricCard
                label="DM -> booked"
                value={fmtPercent(workflowKpis?.conversion.dmToBookedRate)}
                hint={`DM -> sale ${fmtPercent(workflowKpis?.conversion.dmToSaleRate)}`}
              />
              <MetricCard
                label="Booked calls"
                value={fmtNumber(workflowKpis?.conversion.bookedCalls)}
                hint={`Sales ${fmtNumber(workflowKpis?.conversion.sales)}`}
              />
              <MetricCard
                label="Sales value"
                value={fmtNumber(workflowKpis?.conversion.salesValueTotal)}
                hint={`Follow-up completion ${fmtPercent(
                  workflowKpis?.conversion.followupCompletionRate
                )}`}
              />
              <MetricCard
                label="Overdue SLA"
                value={fmtNumber(workflowKpis?.sla.overdueCount)}
                hint={`Conversations ${fmtNumber(workflowKpis?.totals.conversations)}`}
              />
              <MetricCard
                label="Total workflow events"
                value={fmtNumber(workflowKpis?.totals.events)}
                hint={`Window ${fmtNumber(workflowKpis?.days)} days`}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-[#eadcff] bg-white/80 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div className={labelClass}>Top Responders</div>
                <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  {workflowKpis?.leaderboard.topResponders?.length ? (
                    workflowKpis.leaderboard.topResponders.slice(0, 8).map((row) => (
                      <div key={`tr-${row.repId}`} className="flex items-center justify-between">
                        <span>{row.repName}</span>
                        <span>
                          replies {row.replies} | outcome {fmtPercent(row.outcomeRate)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>No responder data yet.</div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#eadcff] bg-white/80 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div className={labelClass}>Fastest Responders</div>
                <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  {workflowKpis?.leaderboard.fastestResponders?.length ? (
                    workflowKpis.leaderboard.fastestResponders.slice(0, 8).map((row) => (
                      <div key={`fr-${row.repId}`} className="flex items-center justify-between">
                        <span>{row.repName}</span>
                        <span>
                          {row.avgFirstResponseMinutes != null
                            ? `${row.avgFirstResponseMinutes.toFixed(1)}m`
                            : '-'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>No response-time data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
            {running ? 'Running...' : 'Run sync'}
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
                      {item.email || item.contactId}{' '}
                      {item.tags?.length ? `(${item.tags.join(', ')})` : ''}
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
    </div>
  );
}
