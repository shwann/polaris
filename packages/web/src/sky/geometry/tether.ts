import type { Point } from '../types';

export interface TetherStar {
  id: string;
  point: Point;
  alpha: number;
}

/** Extra distance (screen px) a newcomer must win by before the tether leaves the star it is on. */
export const TETHER_HOLD = 12;

/**
 * Where a Dipper star's tether to its own cluster should land: the visible task star nearest the cluster's live
 * centre (mean of the visible stars as drawn this frame), stopped `gap` short so the line meets the star's halo.
 * `prev` is the star chosen last frame; it is kept unless another star is clearly nearer the centre, so clusters
 * whose stars sit at equal distances (two stars, a symmetric ring) do not flicker between them as they rotate.
 */
export function tetherEnd(
  from: Point,
  stars: TetherStar[],
  gap: number,
  prev?: string,
  minAlpha = 0.2,
): { id: string; end: Point } | null {
  const live = stars.filter((s) => s.alpha >= minAlpha);
  if (!live.length) return null;
  const cx = live.reduce((n, s) => n + s.point[0], 0) / live.length,
    cy = live.reduce((n, s) => n + s.point[1], 0) / live.length,
    dist = (s: TetherStar) => Math.hypot(s.point[0] - cx, s.point[1] - cy);
  // Nearest to the centre; exact ties go to the smaller id so the first pick is deterministic.
  let hub = live[0]!;
  for (const s of live) {
    const d = dist(s) - dist(hub);
    if (d < -1e-6 || (Math.abs(d) <= 1e-6 && s.id < hub.id)) hub = s;
  }
  const kept = prev === undefined ? undefined : live.find((s) => s.id === prev);
  if (kept && dist(kept) <= dist(hub) + TETHER_HOLD) hub = kept;
  const d = Math.hypot(hub.point[0] - from[0], hub.point[1] - from[1]);
  if (d <= gap * 2) return null;
  const k = (d - gap) / d;
  return { id: hub.id, end: [from[0] + (hub.point[0] - from[0]) * k, from[1] + (hub.point[1] - from[1]) * k] };
}
