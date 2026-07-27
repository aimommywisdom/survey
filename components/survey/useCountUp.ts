'use client';

import { useEffect, useRef, useState } from 'react';

// 把顯示的數字從舊值平滑跳到新值（§9：計數器變動做一次短促 count-up）。
// 尊重 prefers-reduced-motion；用 tabular-nums 顯示，數字不位移。
export function useCountUp(target: number, durationMs = 450): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const from = fromRef.current;
    const to = target;
    if (reduce || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs == null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    // 保底：即使 rAF 被節流（分頁背景等）沒跑完，也保證顯示最終正確值。
    const safety = setTimeout(() => {
      fromRef.current = to;
      setDisplay(to);
    }, durationMs + 120);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      clearTimeout(safety);
    };
  }, [target, durationMs]);

  return display;
}
