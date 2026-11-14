import { FIG_LANE } from '../../domain/lanes';
import type { Lane } from '../../domain/types';
import { fit } from './dipper';
import { MIN_SEPARATION } from '../motion/separation';
import { figureFor } from './figures';
import { clusterSpacing, DONE_SPACING, separatePoints } from './spacing';
import { assignSlots, clusterTree } from './chains';
import type { Point, SkyState, Star } from '../types';

/** How far past the bowl's resting radius the waiting cluster may grow with its count. */
export const BOWL_GROWTH = 1.3;
/** Groups this small sit beside their own Dipper star instead of out in a zone of their own. */
export const NEAR_HUB_MAX = 2;
/** Distance, in units of the chart's size, from a Dipper star to the centre of a small group riding beside it. */
export const NEAR_HUB_GAP = 0.065;
/** The shipped cloud is kept to about half the area it used to cover (radius × √½). */
export const DONE_SHRINK = 0.7;

/** Radius whose ellipse (1.25R × 0.85R) holds n stars at the given spacing, with some slack. */
export const packedRadius = (n: number, spacing: number) => spacing * Math.sqrt(n / (Math.PI * 1.0625)) * 1.05;

export function centre(state: SkyState, g: Lane): [number, number, number] {
  const z = state.ZONE[g]! || state.ZONE.planned,
    n = Math.max(1, state.laneCount(g)),
    spacing = clusterSpacing(state.unit);
  const packed = packedRadius(n, spacing),
    R =
      g === 'done'
        ? state.unit * (0.05 + 0.01 * Math.sqrt(n)) * DONE_SHRINK
        : Math.max(state.unit * (0.05 + 0.016 * Math.sqrt(n)), packed),
    rx = R * 1.25 + 24,
    ry = R * 0.85 + 40;
  // Scorpius has its own patch outside the bowl, clear of the Dipper and the other two figures.
  // The board keeps its original waiting-cloud position.
  if (g === 'waiting' && state.sky && state.ZONE.dip)
    return [state.w * 0.86, state.h * 0.4, Math.max(R, state.unit * 0.11)];
  if (g === 'waiting' && state.ZONE.dip && state.bowl)
    return [state.bowl[0]!, state.bowl[1]!, Math.max(Math.min(R, state.bowl[2]! * BOWL_GROWTH), packed)];
  // On the board the clusters keep clear of the header (the small Dipper lives there); they rise into place with the sky view.
  const zy = state.ZONE.dip ? Math.max(z[1]!, 0.36) + (z[1]! - Math.max(z[1]!, 0.36)) * state.skyK : z[1]!;
  const zone: [number, number, number] = [
    Math.min(Math.max(z[0]! * state.w, rx), state.w - rx),
    Math.min(Math.max(zy * state.h, ry), state.h - ry),
    R,
  ];
  const near = state.ZONE.dip && g !== 'done' && state.laneCount(g) <= NEAR_HUB_MAX ? nearHub(state, g) : null;
  if (!near) return zone;
  const k = state.skyK;
  // The radius stays fixed while the centre travels, so the cached layout stays valid through the transition.
  return [zone[0] + (near[0] - zone[0]) * k, zone[1] + (near[1] - zone[1]) * k, near[2]];
}

/**
 * A group of one or two stars sits just outside its own Dipper star: pointing away from the figure, but never on the
 * side where that star's caption is written.
 */
export function nearHub(state: SkyState, g: Lane): [number, number, number] | null {
  const k = FIG_LANE.indexOf(g);
  if (k < 1 || state.w < 2 || state.h < 2) return null;
  const pts = fit([0.06 * state.w, 0.1 * state.h, 0.86 * state.w, 0.86 * state.h]).slice(0, 7),
    [hx, hy] = pts[k]!,
    mx = pts.reduce((a, p) => a + p[0], 0) / pts.length,
    my = pts.reduce((a, p) => a + p[1], 0) / pts.length,
    d = Math.hypot(hx - mx, hy - my) || 1,
    side = state.ZONE.side[k] ?? 0,
    gap = state.unit * NEAR_HUB_GAP;
  // Caption side as a direction: 1 right, -1 left, 0 below, 2 above.
  const caption: Point = side === 1 ? [1, 0] : side === -1 ? [-1, 0] : side === 2 ? [0, -1] : [0, 1];
  const out: Point = [(hx - mx) / d, (hy - my) / d];
  let best = out,
    score = -Infinity;
  for (let i = 0; i < 16; i++) {
    const dir: Point = [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)],
      value = dir[0] * out[0] + dir[1] * out[1] - (dir[0] * caption[0] + dir[1] * caption[1] > 0.2 ? 3 : 0);
    if (value > score) [score, best] = [value, dir];
  }
  return [hx + best[0] * gap, hy + best[1] * gap, clusterSpacing(state.unit) * 0.6];
}

/** Clusters turn slowly in the overview and come to rest once zoomed in for reading. */
export const SPIN_FULL = 1.2;
export const SPIN_STOP = 2;
export function spinRate(zoom: number) {
  return Math.min(1, Math.max(0, (SPIN_STOP - zoom) / (SPIN_STOP - SPIN_FULL)));
}
/** Advance the cluster spin clock; zooming in slows it down instead of jumping the angle. */
export function advanceSpin(state: SkyState, dt: number) {
  const step = dt * spinRate(state.cam.s);
  state.spinT = (state.spinT ?? 0) + step;
  // A paused group banks the time it skips, so it resumes from where it stopped instead of jumping.
  if (state.paused?.size) {
    state.spinHeld ??= new Map();
    for (const g of state.paused) state.spinHeld.set(g, (state.spinHeld.get(g) ?? 0) + step);
  }
}

export function home(state: SkyState, s: Star, t: number): Point {
  const clock = t === 0 ? 0 : (state.spinT ?? t) - (state.spinHeld?.get(s.group) ?? 0),
    [cx, cy, R] = state.centre(s.group),
    spin =
      s.figureRole && ['waiting', 'risk', 'release', 'planned'].includes(s.group)
        ? 0
        : (((s.group.length % 2 ? 1 : -1) * clock) / 1000) * 0.012;
  if (state.sky && (state.w > 560 || s.figureRole) && s.layoutX !== undefined && s.layoutY !== undefined) {
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
  state.figures.clear();
  for (const group of ['done', 'risk', 'release', 'waiting', 'doing', 'planned'] as const) {
    const list = [...state.stars.values()]
      .filter((s) => !s.dead && s.group === group)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const s of list) {
      s.figureRole = undefined;
      s.separation = undefined;
    }
    const R = state.centre(group)[2];
    const figure = state.sky
      ? figureFor(
          group,
          list.map((s) => s.figureTask ?? { id: s.id, waitingOn: s.wait, recent: s.recent }),
          [0, 0, R],
        )
      : null;
    if (figure) {
      state.figures.set(group, figure);
      for (const role of figure.nodes) {
        const star = state.stars.get(role.id)!;
        [star.layoutX, star.layoutY] = role.point;
        star.figureRole = role;
        star.separation = Math.min(
          MIN_SEPARATION,
          ...figure.nodes
            .filter((n) => n !== role)
            .map((n) => Math.hypot(n.point[0] - role.point[0], n.point[1] - role.point[1]) * 0.98),
        );
      }
      state.trees.set(
        group,
        figure.edges.map((e) => [state.stars.get(figure.nodes[e.a]!.id)!, state.stars.get(figure.nodes[e.b]!.id)!]),
      );
      continue;
    }
    const points = list.map((s): Point => {
      const r = (group === 'done' ? s.rad ** 1.9 : s.rad) * R;
      return [Math.cos(s.ang) * r * 1.25, Math.sin(s.ang) * r * 0.85];
    });
    const spaced = separatePoints(
      points,
      (group === 'done' ? DONE_SPACING : clusterSpacing(state.unit)) / state.layoutScale,
    );
    list.forEach((s, i) => {
      [s.layoutX, s.layoutY] = spaced[i]!;
    });
  }
}

export function rebuild(state: SkyState) {
  state.counts.clear();
  for (const s of state.stars.values()) if (!s.dead) state.counts.set(s.group, (state.counts.get(s.group) || 0) + 1);
  // Stars of one requirement (or module) take neighbouring places before the layout spaces them out.
  for (const g of new Set([...state.stars.values()].map((s) => s.group)))
    assignSlots(
      [...state.stars.values()].filter((s) => !s.dead && s.group === g),
      g === 'done',
    );
  state.trees = new Map();
  layoutHomes(state);
  const byLane = new Map<Lane, Star[]>();
  for (const s of state.stars.values())
    if (!s.dead) (byLane.get(s.group) || byLane.set(s.group, []).get(s.group))!.push(s);
  for (const [g, list] of byLane)
    if (!state.figures.has(g))
      state.trees.set(
        g,
        clusterTree(list, (s) => state.home(s, 0)),
      );
}
