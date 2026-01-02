'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpOptions = {
  durationMs?: number;
  startValue?: number;
  enabled?: boolean;
};

export function useCountUp(target: number | null | undefined, options: CountUpOptions = {}) {
  const { durationMs = 900, startValue = 0, enabled = true } = options;
  const normalizedTarget =
    target == null || Number.isNaN(target) ? null : target;
  const [value, setValue] = useState<number | null>(
    normalizedTarget
  );
  const previousTarget = useRef<number | null>(normalizedTarget);

  useEffect(() => {
    if (!enabled) {
      previousTarget.current = normalizedTarget;
      return;
    }

    let raf = 0;
    const schedule = (next: number | null) => {
      raf = requestAnimationFrame(() => setValue(next));
    };

    if (normalizedTarget == null) {
      schedule(null);
      previousTarget.current = null;
      return () => {
        if (raf) cancelAnimationFrame(raf);
      };
    }

    const from = previousTarget.current ?? startValue;
    const to = normalizedTarget;
    if (from === to) {
      schedule(to);
      previousTarget.current = to;
      return () => {
        if (raf) cancelAnimationFrame(raf);
      };
    }

    previousTarget.current = to;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const next = Math.round(from + (to - from) * progress);
      setValue(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [durationMs, enabled, startValue, normalizedTarget]);

  return enabled ? value : normalizedTarget;
}
