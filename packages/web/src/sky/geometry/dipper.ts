import { DIPPER } from '../../domain/lanes';
import type { Box, Point } from '../types';
export interface Shape {
  pts: Point[];
  w: number;
  h: number;
}
export function shape(deg: number, k = 0): Shape {
  const c = Math.cos((deg * Math.PI) / 180),
    s = Math.sin((deg * Math.PI) / 180);
  const p: Point[] = DIPPER.map((d) => [d.x * c - d.y * s, d.x * s + d.y * c]);
  if (k) p.push([p[0]![0] + (p[0]![0] - p[1]![0]) * k, p[0]![1] + (p[0]![1] - p[1]![1]) * k]);
  const x0 = Math.min(...p.map((q) => q[0])),
    y0 = Math.min(...p.map((q) => q[1]));
  return {
    pts: p.map(([x, y]) => [x - x0, y - y0]),
    w: Math.max(...p.map((q) => q[0])) - x0,
    h: Math.max(...p.map((q) => q[1])) - y0,
  };
}
export const BIG = shape(45, 1.5),
  SMALL = shape(25);
export function fit([x0, y0, x1, y1]: Box, cap = 1e9, S = BIG): Point[] {
  const W = Math.max(0, Math.min((x1 - x0) / S.w, (y1 - y0) / S.h, cap)),
    ox = x0 + (x1 - x0 - S.w * W) / 2,
    oy = y0 + (y1 - y0 - S.h * W) / 2;
  return S.pts.map(([x, y]) => [ox + x * W, oy + y * W]);
}
export const orbitRadius = (value: number) => Math.max(0, value);
