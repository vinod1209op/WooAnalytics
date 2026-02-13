'use client';

import { useCallback, useEffect, useState } from 'react';
import { getJson } from '@/lib/api';

export type GhlWorkflowKpisResponse = {
  days: number;
  slaMinutes: number;
  totals: {
    events: number;
    conversations: number;
  };
  engagement: {
    inboundMessages: number;
    repliedMessages: number;
    responseRate: number | null;
    averageFirstResponseMinutes: number | null;
    repliedWithinSlaPct: number | null;
    sentiment: { positive: number; neutral: number; negative: number };
    hotLeadPct: number | null;
  };
  conversion: {
    dmToBookedRate: number | null;
    dmToSaleRate: number | null;
    bookedCalls: number;
    sales: number;
    salesValueTotal: number;
    followupCompletionRate: number | null;
  };
  team: Array<{
    repId: string;
    repName: string;
    replies: number;
    booked: number;
    sales: number;
    avgFirstResponseMinutes: number | null;
    outcomeRate: number | null;
  }>;
  sla: {
    overdueCount: number;
    overdue: Array<{
      conversationId: string;
      contactId: string | null;
      ageMinutes: number;
      repName: string;
      channel: string | null;
    }>;
  };
  leaderboard: {
    topResponders: Array<{
      repId: string;
      repName: string;
      replies: number;
      booked: number;
      sales: number;
      avgFirstResponseMinutes: number | null;
      outcomeRate: number | null;
    }>;
    fastestResponders: Array<{
      repId: string;
      repName: string;
      replies: number;
      booked: number;
      sales: number;
      avgFirstResponseMinutes: number | null;
      outcomeRate: number | null;
    }>;
  };
};

export function useGhlWorkflowKpis(days: number, slaMinutes: number) {
  const [data, setData] = useState<GhlWorkflowKpisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('days', String(days));
    params.set('slaMinutes', String(slaMinutes));

    try {
      setLoading(true);
      setError(null);
      const response = await getJson<GhlWorkflowKpisResponse>(
        '/customers/ghl-workflow-kpis',
        params
      );
      setData(response);
    } catch (err) {
      console.error('useGhlWorkflowKpis error:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Failed to load workflow KPIs';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, slaMinutes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

