'use client';

import { useCallback, useEffect, useState } from 'react';
import { getJson } from '@/lib/api';
import { useStore } from '@/providers/store-provider';

export type GhlDashboardResponse = {
  days: number;
  from: string;
  to: string;
  locationId: string;
  summary: {
    email: {
      sent: number;
      spam: number;
      opens: number;
      spamOpens: number;
      spamRate: number | null;
      openRate: number | null;
      spamOpenRate: number | null;
    };
    dm: {
      sent: number;
      replies: number;
      replyRate: number | null;
      avgPerActiveDay: number | null;
      maxPerDay: number | null;
      currentTarget: number;
      nextTarget: number | null;
      checkpoints: number[];
      targetMetDays: number;
      activeDays: number;
    };
    instagram: {
      dmSent: number;
      dmReplies: number;
      comments: number;
      likes: number;
      engagementScore: number;
    };
    channels: {
      email: number;
      instagram: number;
      sms: number;
      call: number;
      other: number;
    };
    ghl: {
      pitConfigured: boolean;
      locationConfigured: boolean;
      customerSampleCount: number | null;
      templateSampleCount: number | null;
    };
  };
  diagnostics: {
    messagesScanned: number;
    pageLimit: number;
    pagesFetched: number;
    totalHint: number | null;
    statusBreakdown: Array<{ value: string; count: number }>;
    messageTypeBreakdown: Array<{ value: string; count: number }>;
    directionBreakdown: Array<{ value: string; count: number }>;
    warnings: string[];
  };
};

type UseGhlDashboardArgs = {
  days: number;
  locationId?: string;
};

export function useGhlDashboard({ days, locationId }: UseGhlDashboardArgs) {
  const { loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<GhlDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (loadingStore) return;

    const params = new URLSearchParams();
    params.set('days', String(days));
    if (locationId?.trim()) params.set('locationId', locationId.trim());

    try {
      setLoading(true);
      setError(null);
      const response = await getJson<GhlDashboardResponse>(
        '/customers/ghl-dashboard',
        params
      );
      setData(response);
    } catch (err) {
      console.error('useGhlDashboard error:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Failed to load GHL dashboard';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, loadingStore, locationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
    refresh,
  };
}
