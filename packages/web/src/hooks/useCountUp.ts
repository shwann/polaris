import { useEffect, useRef } from 'react';
const shown = new Map<string, number>();
export function useCountUp(key: string, to: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = shown.get(key) || 0;
    shown.set(key, to);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      node.textContent = String(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const frame = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      node.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 4))));
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    node.textContent = String(from);
    raf = requestAnimationFrame(frame);
    // Background tabs and hidden panes may never run animation frames; never leave the old number showing.
    const settle = setTimeout(() => {
      cancelAnimationFrame(raf);
      node.textContent = String(to);
    }, 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [key, to]);
  return ref;
}
