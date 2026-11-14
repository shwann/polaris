import { DIPPER_LINES, FIG_LANE } from '../../domain/lanes';
import { tetherEnd } from '../geometry/tether';
import { hubHomes } from '../layout';
import type { Drag, Point, SkyState, Star } from '../types';
import { advance, HOME, DAMPING, resetParticle, type Constraint, type Particle } from './softbody';
import { MIN_SEPARATION } from './separation';

export const HUB_HOME = 100;
export const HUB_DAMPING = 16;
export const HUB_COMPLIANCE = 0.08;
export const POLAR_COMPLIANCE = 0.012;
export const hubDraggable = (s: SkyState) => s.sky && s.w > 560 && !s.reduce.matches;
export const draggedParticle = (s: SkyState, d: Drag) =>
  d.star || (hubDraggable(s) ? s.hubParticles[d.dip] : undefined);

export function syncHubs(s: SkyState) {
  hubHomes(s).forEach(([x, y], i) => {
    const p = (s.hubParticles[i] ??= { ox: 0, oy: 0, vx: 0, vy: 0 });
    p.home = s.soft.hubDrag === 7 ? HOME : HUB_HOME;
    p.damping = s.soft.hubDrag === 7 ? DAMPING : HUB_DAMPING;
    [p.baseX, p.baseY] = [x, y];
    if (!hubDraggable(s)) resetParticle(p);
  });
}

export function moveHeld(s: SkyState, d: Drag, x = s.px, y = s.py): Point | undefined {
  const p = draggedParticle(s, d);
  if (!p) return;
  const [wx, wy] = s.toWorld(x, y),
    parallax = d.star ? 14 : 0;
  const point: Point = [wx - s.mx * parallax + d.grab[0] - p.baseX!, wy - s.my * parallax + d.grab[1] - p.baseY!];
  if (d.star) {
    d.star.x = p.baseX! + point[0];
    d.star.y = p.baseY! + point[1];
  }
  return point;
}

/** Hub tethers transmit gently outward only; a task drag cannot disturb other lanes via the Dipper. */
export function constellation(s: SkyState, list: Star[], dt: number, time?: number) {
  syncHubs(s);
  const hubs = s.hubParticles,
    edges: Constraint[] = [];
  for (const tree of s.trees.values())
    for (const [a, b] of tree) if (!a.dead && !b.dead && a.group === b.group) edges.push({ a, b });
  if (hubDraggable(s)) {
    for (const [a, b] of [...DIPPER_LINES, [0, 7]])
      edges.push({
        a: hubs[a!]!,
        b: hubs[b!]!,
        compliance: s.soft.hubDrag === 7 ? POLAR_COMPLIANCE : HUB_COMPLIANCE,
        stiffening: s.soft.hubDrag === 7 ? 6 : 0,
      });
    for (let k = 1; k < 7; k++) {
      const p = hubs[k]!,
        b = clusterTether(s, k)?.star;
      if (b && Math.hypot(p.ox, p.oy) > 0.015) edges.push({ a: p, b, oneWay: true, compliance: 0.05 });
    }
  }
  const d = s.drag?.moved ? s.drag : null,
    particle = d ? draggedParticle(s, d) : undefined,
    point = d && particle ? moveHeld(s, d) : undefined;
  if (s.reduce.matches || s.w <= 560) {
    // Preserve the existing mobile motion path in physics.ts; reduced motion moves only the held star.
    if (s.reduce.matches) for (const p of list) resetParticle(p);
    if (particle && point) [particle.ox, particle.oy] = point;
    s.soft.remainder = 0;
    s.soft.pin = undefined;
  } else {
    const groups: Particle[][] = [...new Set(list.filter((p) => !p.dead).map((p) => p.group))].map((g) =>
      list.filter((p) => !p.dead && p.group === g),
    );
    if (hubDraggable(s)) groups.push(hubs);
    // Input can advance the held pose to its release timestamp between rendered frames.
    const duration = time === undefined || s.soft.time === undefined ? dt : Math.max(0, time - s.soft.time);
    if (time !== undefined) s.soft.time = Math.max(time, s.soft.time ?? time);
    advance(
      s.soft,
      [...list, ...hubs],
      edges,
      duration,
      particle && point ? { particle, point } : undefined,
      groups,
      MIN_SEPARATION / s.cam.s,
    );
  }
  // Project these fixed silhouettes onto one translation after the existing solver. A held star leads the figure;
  // otherwise the mean preserves its spring return and pointer response without bending the claws or tail.
  for (const lane of ['waiting', 'risk', 'release', 'planned'] as const) {
    const figure = list.filter((p) => !p.dead && p.group === lane && p.figureRole);
    if (!s.sky || !figure.length) continue;
    const held = figure.find((p) => p === particle),
      mean = (key: 'ox' | 'oy' | 'vx' | 'vy') =>
        held ? held[key] : figure.reduce((sum, p) => sum + p[key], 0) / figure.length;
    const [ox, oy, vx, vy] = [mean('ox'), mean('oy'), mean('vx'), mean('vy')];
    for (const p of figure) Object.assign(p, { ox, oy, vx, vy });
  }
  for (const p of list) [p.x, p.y] = [p.baseX! + p.ox, p.baseY! + p.oy];
}

/** One selection path keeps the dotted endpoint and the simulated attachment identical. */
export function clusterTether(s: SkyState, k: number, from = s.hubs()[k]!, locked = false) {
  const group = FIG_LANE[k]!,
    heart = group === 'waiting' ? s.figures.get(group)?.nodes.find((n) => n.main)?.id : undefined,
    previous = heart ?? s.tetherHub.get(group);
  const hit = tetherEnd(
    from,
    [...s.stars.values()]
      .filter(
        (v) => v.group === group && !v.dead && (heart ? v.id === heart : !locked || !previous || v.id === previous),
      )
      .map((v) => ({ id: v.id, point: s.at(v.x, v.y, 14), alpha: v.alpha })),
    7 * s.sz,
    previous,
  );
  if (!hit) {
    s.tetherHub.delete(group);
    return null;
  }
  s.tetherHub.set(group, hit.id);
  return { ...hit, star: s.stars.get(hit.id)! };
}
