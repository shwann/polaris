import type { Point } from '../types';

export interface TetherStar {
  point: Point;
  alpha: number;
}

/**
 * Where a Dipper star's tether to its own cluster should land: the nearest visible task star, as drawn this frame,
 * stopped `gap` short of it so the line meets the star's halo instead of piercing it or ending in empty space.
 */
export function tetherEnd(from: Point, stars: TetherStar[], gap: number, minAlpha = 0.2): Point | null {
  let best: Point | null = null,
    bestD = Infinity;
  for (const s of stars) {
    if (s.alpha < minAlpha) continue;
    const d = Math.hypot(s.point[0] - from[0], s.point[1] - from[1]);
    if (d < bestD) {
      bestD = d;
      best = s.point;
    }
  }
  if (!best || bestD <= gap * 2) return null;
  const k = (bestD - gap) / bestD;
  return [from[0] + (best[0] - from[0]) * k, from[1] + (best[1] - from[1]) * k];
}
