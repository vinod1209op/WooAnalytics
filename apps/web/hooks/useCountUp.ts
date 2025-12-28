'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpOptions = {
  durationMs?: number;
  startValue?: number;
  enabled?: boolean;
};

export function useCountUp(target: number | null | undefined, options: CountUpOptions = {}) {
  const { durationMs = 900, startValue = 0, enabled = true } = options;
  const [value, setValue] = useState<number | null>(
    target == null || Number.isNaN(target) ? null : target
  );
  const previousTarget = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target == null || Number.isNaN(target) ? null : target);
      previousTarget.current = target == null || Number.isNaN(target) ? null : target;
      return;
    }

    if (target == null || Number.isNaN(target)) {
      setValue(null);
      previousTarget.current = null;
      return;
    }

    const from = previousTarget.current ?? startValue;
    const to = target;
    if (from === to) {
      setValue(to);
      previousTarget.current = to;
      return;
    }

    previousTarget.current = to;
    const start = performance.now();
    let raf = 0;

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
  }, [durationMs, enabled, startValue, target]);

  return value;
}
