import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getEngine } from './skyBridge';
export function useDipPlacement(ref: RefObject<HTMLDivElement | null>, index: number) {
  const xy = useRef<[number, number] | null>(null),
    [dragging, setDragging] = useState(false),
    release = useRef<(() => void) | null>(null);
  const place = useCallback(() => {
    const node = ref.current;
    if (!node || innerWidth <= 560) return;
    const W = innerWidth,
      H = innerHeight,
      cw = node.offsetWidth,
      ch = node.offsetHeight,
      m = 16;
    let x, y;
    if (xy.current) [x, y] = xy.current;
    else {
      const p = getEngine()?.dipScreen(index) || [W * 0.4, 60],
        gp = getEngine()?.groupScreen(index),
        left = gp ? gp[0] > p[0]! : p[0]! + 28 + cw > W - m;
      x = left ? p[0]! - 28 - cw : p[0]! + 28;
      y = p[1]! + 18;
      if (x < m && left) x = p[0]! + 28;
    }
    x = Math.max(m, Math.min(x, W - cw - m));
    y = Math.max(m, Math.min(y, H - ch - 90));
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    xy.current = [x, y];
  }, [index, ref]);
  useLayoutEffect(() => {
    xy.current = null;
    const node = ref.current;
    if (!node || index < 0) return;
    const W = innerWidth,
      H = innerHeight,
      cw = node.offsetWidth,
      ch = node.offsetHeight,
      m = 16,
      p = getEngine()?.dipScreen(index) || [W * 0.4, 60],
      gp = getEngine()?.groupScreen(index),
      left = gp ? gp[0] > p[0]! : p[0]! + 28 + cw > W - m;
    let x = left ? p[0]! - 28 - cw : p[0]! + 28;
    if (x < m && left) x = p[0]! + 28;
    const y = Math.max(m, Math.min(p[1]! + 18, H - ch - 90));
    x = Math.max(m, Math.min(x, W - cw - m));
    xy.current = [x, y];
    if (W > 560) node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }, [index, ref]);
  useEffect(() => {
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      release.current?.();
    };
  }, [place]);
  return {
    dragging,
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button') || innerWidth <= 560 || e.button > 0) return;
      const [x0, y0] = xy.current || [0, 0],
        sx = e.clientX,
        sy = e.clientY;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const move = (ev: PointerEvent) => {
        xy.current = [x0 + ev.clientX - sx, y0 + ev.clientY - sy];
        place();
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        release.current = null;
      };
      release.current = up;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
  };
}
