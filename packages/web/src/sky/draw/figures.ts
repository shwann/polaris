import { COL } from '../../domain/lanes';
import type { Lane } from '../../domain/types';
import type { Point, SkyState } from '../types';
import { rgba } from '../palette';

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
  if (figure.spur) {
    const { at, from, offset } = figure.spur,
      p = points[from]!,
      q = points[at]!;
    c.setLineDash([4 * s.sz, 3 * s.sz]);
    c.lineWidth = 1.4;
    c.strokeStyle = rgba(COL[lane], 0.9 * stars[at]!.alpha);
    c.beginPath();
    c.moveTo(...q);
    c.lineTo(...localPoint(p, q, offset));
    c.stroke();
  }
  c.restore();
}
export function localPoint(a: Point, b: Point, [along, across]: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  return [(a[0] + b[0]) / 2 + along * dx - across * dy, (a[1] + b[1]) / 2 + along * dy + across * dx];
}
