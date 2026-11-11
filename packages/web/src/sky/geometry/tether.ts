import type { Point } from '../types';

export interface TetherStar {
  point: Point;
  alpha: number;
}

/**
 * Where a Dipper star's tether to its own cluster should land: the visible task star nearest the cluster's live
 * centre (mean of the visible stars as drawn this frame), stopped `gap` short so the line meets the star's halo
 * instead of piercing it or ending in empty space.
 */
export function tetherEnd(from: Point, stars: TetherStar[], gap: number, minAlpha = 0.2): Point | null {
  const live = stars.filter((s) => s.alpha >= minAlpha);
  if (!live.length) return null;
  const cx = live.reduce((n, s) => n + s.point[0], 0) / live.length,
    cy = live.reduce((n, s) => n + s.point[1], 0) / live.length;
  let hub = live[0]!.point,
    best = Infinity;
  for (const s of live) {
    const d = Math.hypot(s.point[0] - cx, s.point[1] - cy);
    if (d < best) {
      best = d;
      hub = s.point;
    }
  }
  const d = Math.hypot(hub[0] - from[0], hub[1] - from[1]);
  if (d <= gap * 2) return null;
  const k = (d - gap) / d;
  return [from[0] + (hub[0] - from[0]) * k, from[1] + (hub[1] - from[1]) * k];
}
