import { separatePoints, STAR_SPACING } from './spacing';
import type { Point, SkyState, Star } from '../types';

export function centre(state: SkyState, g: import('../../domain/types').Lane): [number, number, number] {
  const z = state.ZONE[g]! || state.ZONE.planned,
    n = Math.max(1, state.laneCount(g)),
    R = g === 'done' ? state.unit * (0.05 + 0.01 * Math.sqrt(n)) : state.unit * (0.05 + 0.016 * Math.sqrt(n)),
    rx = R * 1.25 + 24,
    ry = R * 0.85 + 40;
  // Waiting work rides in the Dipper's bowl: centred in it and kept small enough not to spill over the bowl's edges.
  if (g === 'waiting' && state.ZONE.dip && state.bowl)
    return [state.bowl[0]!, state.bowl[1]!, Math.min(R, state.bowl[2]!)];
  // On the board the clusters keep clear of the header (the small Dipper lives there); they rise into place with the sky view.
  const zy = state.ZONE.dip ? Math.max(z[1]!, 0.36) + (z[1]! - Math.max(z[1]!, 0.36)) * state.skyK : z[1]!;
  return [Math.min(Math.max(z[0]! * state.w, rx), state.w - rx), Math.min(Math.max(zy * state.h, ry), state.h - ry), R];
}

export function home(state: SkyState, s: Star, t: number): Point {
  const [cx, cy, R] = state.centre(s.group),
    spin = (((s.group.length % 2 ? 1 : -1) * t) / 1000) * 0.012;
  if (state.sky && state.w > 560 && s.layoutX !== undefined && s.layoutY !== undefined) {
    return [
      cx + s.layoutX * Math.cos(spin) - s.layoutY * Math.sin(spin),
      cy + s.layoutX * Math.sin(spin) + s.layoutY * Math.cos(spin),
    ];
  }
  const a = s.ang + spin,
    r = (s.group === 'done' ? s.rad ** 1.9 : s.rad) * R;
  return [cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 0.85];
}

/** Recompute only when data, viewport or a zoom-out spacing bucket changes. */
export function layoutHomes(state: SkyState) {
  state.layoutScale = Math.max(0.5, Math.floor(Math.min(1, state.camT.s) * 10) / 10);
  for (const group of ['done', 'risk', 'release', 'waiting', 'doing', 'planned'] as const) {
    const list = [...state.stars.values()]
      .filter((s) => !s.dead && s.group === group)
      .sort((a, b) => a.id.localeCompare(b.id));
    const R = state.centre(group)[2];
    const points = list.map((s): Point => {
      const r = (group === 'done' ? s.rad ** 1.9 : s.rad) * R;
      return [Math.cos(s.ang) * r * 1.25, Math.sin(s.ang) * r * 0.85];
    });
    const spaced = separatePoints(points, STAR_SPACING / state.layoutScale);
    list.forEach((s, i) => {
      [s.layoutX, s.layoutY] = spaced[i]!;
    });
  }
}

export function rebuild(state: SkyState) {
  state.counts.clear();
  for (const s of state.stars.values()) if (!s.dead) state.counts.set(s.group, (state.counts.get(s.group) || 0) + 1);
  layoutHomes(state);
  state.trees = new Map();
  const byLane = new Map<import('../../domain/types').Lane, Star[]>();
  for (const s of state.stars.values())
    if (!s.dead) (byLane.get(s.group) || byLane.set(s.group, []).get(s.group))!.push(s);
  for (const [g, list] of byLane) {
    const pts = list.map((s) => state.home(s, 0)),
      inT = new Set([0]),
      edges: [Star, Star][] = [];
    while (inT.size < list.length) {
      let best: [number, number, number] | null = null;
      for (const i of inT)
        for (let j = 0; j < list.length; j++) {
          if (inT.has(j)) continue;
          const d = (pts[i]![0]! - pts[j]![0]!) ** 2 + (pts[i]![1]! - pts[j]![1]!) ** 2;
          if (!best || d < best[2]!) best = [i, j, d];
        }
      if (!best) break;
      inT.add(best[1]!);
      edges.push([list[best[0]!]!, list[best[1]!]!]);
    }
    state.trees.set(g, edges);
  }
}
