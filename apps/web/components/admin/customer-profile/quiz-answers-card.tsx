'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

function stripQuestionNumber(label: string) {
  const cleaned = label.replace(/^\s*\d+\s*[).:-]\s*/g, '').trim();
  return cleaned || label.trim() || 'Question';
}

function isNonQuestionField(label?: string | null, fieldKey?: string | null) {
  const hay = `${label ?? ''} ${fieldKey ?? ''}`.toLowerCase();
  if (!hay.trim()) return false;
  if (hay.includes('total spend')) return true;
  if (hay.includes('ltv') || hay.includes('lifetime value')) return true;
  const orderTokens = ['order', 'orders'];
  const metricTokens = ['total', 'count', 'date', 'value', 'subscription', 'spend'];
  if (orderTokens.some((token) => hay.includes(token)) && metricTokens.some((token) => hay.includes(token))) {
    return true;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatQuizKey(key: string) {
  if (!key) return 'Value';
  const spaced = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderQuizValue(value: unknown) {
  if (value == null || value === '') {
    return <span className="text-slate-400">—</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={`${index}-${String(item)}`} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span className="break-words">{String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (isRecord(value)) {
    return (
      <pre className="whitespace-pre-wrap text-xs text-slate-500">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

type RawQuizAnswers = {
  raw?: Record<string, unknown>;
  rawFields?: Array<{
    id?: string;
    name?: string | null;
    fieldKey?: string | null;
    value?: unknown;
  }>;
  messaging?: Record<string, unknown>;
  derived?: Record<string, unknown>;
};

export function QuizAnswersCard({ rawQuizAnswers }: { rawQuizAnswers?: RawQuizAnswers | null }) {
  if (!rawQuizAnswers) {
    return (
      <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
        <div className="mt-3 text-sm text-slate-500">No quiz answers found.</div>
      </Card>
    );
  }

  const quizFields = Array.isArray(rawQuizAnswers.rawFields) ? rawQuizAnswers.rawFields : [];
  const quizRaw = isRecord(rawQuizAnswers.raw) ? rawQuizAnswers.raw : {};
  const quizMessaging = isRecord(rawQuizAnswers.messaging) ? rawQuizAnswers.messaging : null;
  const quizDerived = isRecord(rawQuizAnswers.derived) ? rawQuizAnswers.derived : null;
  const entries = quizFields.length
    ? quizFields
        .map((field) => {
          const rawLabel = field.name || field.fieldKey || field.id || 'Question';
          return {
            id: field.id,
            rawLabel,
            fieldKey: field.fieldKey,
            label: stripQuestionNumber(rawLabel),
            value: field.value,
          };
        })
        .filter((entry) => !isNonQuestionField(entry.rawLabel, entry.fieldKey))
    : Object.entries(quizRaw)
        .map(([key, value]) => ({
          id: key,
          rawLabel: key,
          fieldKey: null,
          label: stripQuestionNumber(key),
          value,
        }))
        .filter((entry) => !isNonQuestionField(entry.rawLabel, entry.fieldKey));

  return (
    <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-transparent pb-2 group-open:border-[#f0e5ff] dark:group-open:border-purple-900/40">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
              Questions answered
            </div>
            <span className="text-[11px] uppercase tracking-wide text-slate-400 group-open:text-slate-500">
              Toggle
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge
              variant="outline"
              className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
            >
              Responses {entries.length}
            </Badge>
            {quizMessaging && (
              <Badge
                variant="outline"
                className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
              >
                Messaging {Object.keys(quizMessaging).length}
              </Badge>
            )}
            {quizDerived && (
              <Badge
                variant="outline"
                className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
              >
                Derived {Object.keys(quizDerived).length}
              </Badge>
            )}
          </div>
        </summary>

        {entries.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {entries.map((entry, index) => (
              <details
                key={`${entry.id ?? entry.label}-${index}`}
                className="group rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm transition hover:border-[#d4bfff] dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#dcc7ff] bg-white text-xs font-semibold text-[#5b3ba4] shadow-sm dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Question {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-100">
                          {entry.label}
                        </div>
                      </div>
                    </div>
                    {entry.id && (
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        ID {entry.id}
                      </span>
                    )}
                  </div>
                </summary>
                <div className="mt-3 border-t border-[#f0e5ff] pt-3 text-sm text-slate-600 dark:border-purple-900/40 dark:text-slate-200">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Answer</div>
                  <div className="mt-2">{renderQuizValue(entry.value)}</div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">No quiz answers found.</div>
        )}

        {(quizMessaging || quizDerived) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {quizMessaging && (
              <div className="rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Messaging cues
                </div>
                <div className="mt-2 space-y-2">
                  {Object.entries(quizMessaging)
                    .filter(([key]) => key !== 'resultFields')
                    .map(([key, value]) => (
                      <div key={key}>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          {formatQuizKey(key)}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                          {renderQuizValue(value)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {quizDerived && (
              <div className="rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Derived insights
                </div>
                <div className="mt-2 space-y-2">
                  {Object.entries(quizDerived).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        {formatQuizKey(key)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                        {renderQuizValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </details>
    </Card>
  );
}
