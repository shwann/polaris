import { COL } from '../../domain/lanes';
import type { Lane } from '../../domain/types';
import type { Point, SkyState } from '../types';
import { rgba } from '../palette';
import { SPIN_STOP } from '../geometry/clusters';
import { SCORPIUS_SWING_PERIOD } from '../geometry/scorpiusSwing';
import { travelingGlow } from './travelingGlow';

/** All endpoints are resolved from the simulated stars, never from cached template coordinates. */
export function drawFigure(s: SkyState, lane: Lane) {
  const figure = s.figures.get(lane);
  if (!figure) return;
  const stars = figure.nodes.map((n) => s.stars.get(n.id)!);
  const points = stars.map((star) => s.at(star.x, star.y, 14));
  const chain = s.hover?.group === lane ? s.hover.chain : undefined;
  const lit = s.litGroup === lane || (s.hover?.group === lane && !chain);
  const detail = lane === 'done' ? Math.max(0, Math.min(1, (s.cam.s - 1.2) / 1.2)) : 1;
  const c = s.ctx;
  c.save();
  c.lineCap = 'round';
  for (const edge of figure.edges) {
    const a = stars[edge.a]!,
      b = stars[edge.b]!;
    if (a.dead || b.dead) continue;
    const on = lit || (!!chain && a.chain === chain && b.chain === chain);
    const fade = edge.bright ? 1 : on ? 1 : detail;
    if (fade <= 0) continue;
    const p = points[edge.a]!;
    let q = points[edge.b]!;
    if (edge.end) {
      const [i, j, t] = edge.end,
        u = points[i]!,
        v = points[j]!;
      q = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
    }
    c.setLineDash(edge.bright ? [4 * s.sz, 3 * s.sz] : [2 * s.sz, 3 * s.sz]);
    c.lineWidth = edge.bright ? (on ? 1.5 : 1.35) : 0.8;
    c.strokeStyle = rgba(
      COL[lane],
      Math.min(1, (edge.bright ? 0.9 : 0.32) * (edge.alpha ?? 1) * (on ? 1.45 : 1)) * fade * Math.min(a.alpha, b.alpha),
    );
    c.beginPath();
    c.moveTo(...p);
    if (edge.start) c.lineTo(...localPoint(p, q, edge.start));
    if (edge.control) c.quadraticCurveTo(...localPoint(p, q, edge.control), ...q);
    else c.lineTo(...q);
    c.stroke();
  }
  for (const arc of figure.arcs ?? []) {
    const a = stars[arc.from]!,
      b = stars[arc.at]!;
    if (a.dead || b.dead) continue;
    const p = points[arc.from]!,
      q = points[arc.at]!,
      on = lit || (!!chain && a.chain === chain && b.chain === chain);
    c.setLineDash([2 * s.sz, 3 * s.sz]);
    c.lineWidth = 0.8;
    c.strokeStyle = rgba(COL[lane], 0.32 * (on ? 1.45 : 1) * Math.min(a.alpha, b.alpha));
    c.beginPath();
    c.moveTo(...localPoint(p, q, arc.start));
    c.quadraticCurveTo(...localPoint(p, q, arc.control), ...localPoint(p, q, arc.end));
    c.stroke();
  }
  if (figure.spur) {
    const { at, from, offset } = figure.spur,
      p = points[from]!,
      q = points[at]!;
    c.setLineDash([4 * s.sz, 3 * s.sz]);
    c.lineWidth = 1.4;
    c.strokeStyle = rgba(COL[lane], 0.9 * stars[at]!.alpha);
    const tip = localPoint(p, q, offset);
    c.beginPath();
    c.moveTo(...q);
    c.lineTo(...tip);
    c.stroke();
    if (
      lane === 'waiting' &&
      !s.reduce.matches &&
      !s.paused?.has(lane) &&
      !s.drag &&
      !s.figureReturns?.has(lane) &&
      s.cam.s < SPIN_STOP &&
      !stars[at]!.dead
    ) {
      const tail = figure.nodes.flatMap((node, i) => (/^(T[1-4]|S)$/.test(node.slot) ? [points[i]!] : []));
      const clock = (s.spinT ?? 0) - (s.spinHeld?.get(lane) ?? 0);
      const phase = (clock + SCORPIUS_SWING_PERIOD / 4) % (SCORPIUS_SWING_PERIOD / 2);
      travelingGlow(s, tail.length > 1 ? [...tail, tip] : [p, q, tip], COL[lane], Math.min(1, phase / 2300), {
        width: 3,
        trail: 0.42,
        opacity: Math.min(1, phase / 250, (3000 - phase) / 700),
      });
    }
  }
  c.restore();
}
export function localPoint(a: Point, b: Point, [along, across]: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  return [(a[0] + b[0]) / 2 + along * dx - across * dy, (a[1] + b[1]) / 2 + along * dy + across * dx];
}
