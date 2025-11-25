"use client";

import React from "react";

type ChartFrameProps = {
  loading?: boolean;
  error?: string | null;
  hasData: boolean;
  children: React.ReactNode;
  heightClass?: string;
  padded?: boolean;
};

export function ChartFrame({
  loading,
  error,
  hasData,
  children,
  heightClass = "h-80",
  padded = true,
}: ChartFrameProps) {
  if (loading) return <Skeleton heightClass={heightClass} />;
  if (error) return <ErrorMessage message={error} heightClass={heightClass} />;
  if (!hasData) return <Empty heightClass={heightClass} />;

  return (
    <div
      className={`${heightClass} rounded-2xl border border-[#e9d5ff] bg-gradient-to-b from-white via-[#f8f5ff] to-white/80 shadow-[0_14px_48px_rgba(124,58,237,0.12)] ring-1 ring-[#e9d5ff]/70 dark:border-purple-900/60 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#23143c] dark:to-[#1a0f2b] dark:ring-purple-900/60 ${padded ? "p-3" : ""}`}
    >
      {children}
    </div>
  );
}

function Skeleton({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`${heightClass} animate-pulse rounded-2xl border border-dashed border-[#e9d5ff] bg-[#f6f0ff]/70 dark:border-purple-900/60 dark:bg-purple-950/30`}
    />
  );
}

function Empty({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`flex ${heightClass} items-center justify-center rounded-2xl border border-dashed border-[#e9d5ff] bg-white/40 text-sm text-[#6f4bb3] dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-100`}
    >
      No data for this range.
    </div>
  );
}

function ErrorMessage({ message, heightClass }: { message: string; heightClass: string }) {
  return (
    <div
      className={`flex ${heightClass} items-center justify-center rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white px-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40`}
    >
      {message}
    </div>
  );
}
