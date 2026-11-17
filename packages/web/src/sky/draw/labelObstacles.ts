import { MAG } from '../../domain/lanes';
import type { Box, Point, SkyState, Star } from '../types';
import { aquariusObstacles, hitsSegment, type Segment } from './aquariusObstacles';
import { localPoint } from './figures';

export interface Halo {
  id: string;
  point: Point;
  radius: number;
}
export const intersects = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
export function hitsHalo(box: Box, { point: [x, y], radius }: Halo) {
  const dx = x - Math.max(box[0], Math.min(x, box[2])),
    dy = y - Math.max(box[1], Math.min(y, box[3]));
  return dx * dx + dy * dy < radius * radius;
}
export function labelFits(box: Box, boxes: Box[], halos: Halo[], segments: Segment[] = []) {
  return (
    !boxes.some((b) => intersects(box, b)) &&
    !halos.some((h) => hitsHalo(box, h)) &&
    !segments.some((line) => hitsSegment(box, line))
  );
}
export function figureSize(star: Star) {
  const size = star.figureRole?.size ?? 1;
  return star.figureRole && !star.figureRole.bright && size <= 1 ? size * 0.65 : size;
}
export function haloRadius(s: SkyState, star: Star, t: number) {
  const held = s.drag?.star === star,
    r = (MAG[star.group] || 1.7) * s.sz * figureSize(star) * (held ? 1.25 : 1),
    throb = star.late ? 0.5 + 0.5 * Math.sin(t / 420 + star.ph) : 0;
  return r * (5.5 + throb * 5 + star.flare * 10 + (held ? 7 : s.hover === star ? 4 : 0));
}
/** Labels avoid the bright inner part of a halo; the soft outer fade may sit under text. */
export const HALO_KEEP = 0.5;
/**
 * Halo size used for label layout. It ignores the time-varying throb of late stars and
 * twinkle flares, so a label does not toggle between fitting and not fitting every frame.
 */
export function steadyHaloRadius(s: SkyState, star: Star) {
  const held = s.drag?.star === star,
    r = (MAG[star.group] || 1.7) * s.sz * figureSize(star) * (held ? 1.25 : 1);
  return r * (5.5 + (held ? 7 : s.hover === star ? 4 : 0)) * HALO_KEEP;
}
/** DOM panels over the chart (tool bar, legend) in world coordinates; labels never sit under them. */
export function domBoxes(s: SkyState): Box[] {
  return (['skybar', 'legend'] as const).flatMap((key) => {
    const r = s.registry.get(key);
    return r && r.width > 0 && r.height > 0
      ? [[...s.toWorld(r.left, r.top), ...s.toWorld(r.right, r.bottom)] as Box]
      : [];
  });
}
/** Distance from each star to its nearest visible neighbour, as drawn. */
export function nearestGaps(points: Point[]): number[] {
  return points.map((p, i) =>
    points.reduce((best, q, j) => (i === j ? best : Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]))), Infinity),
  );
}
/** Layout halos never exceed half the gap to the nearest star, so two neighbours never block each other's labels. */
export function starHalos(s: SkyState): Halo[] {
  const live = [...s.stars.values()].filter((p) => !p.dead && p.alpha > 0.02),
    points = live.map((p) => s.at(p.x, p.y, 14)),
    gaps = nearestGaps(points);
  return live.map((p, i) => ({
    id: p.id,
    point: points[i]!,
    radius: Math.min(steadyHaloRadius(s, p), gaps[i]! / 2),
  }));
}
/** Clearance, in sz, kept between a Dipper caption and any task label, so the two never read as one line. */
export const HUB_MARGIN = 6;
/** Radius, in sz, around a Dipper star that task labels keep clear of. */
export const HUB_STAR_KEEP = 11;
/**
 * Dipper captions come first: their boxes, then the DOM panels and the shipped cloud's "已完成 N 项" title (left out
 * when placing that title itself), then every star's bright halo core.
 */
export function labelObstacles(s: SkyState, withDone = true) {
  const m = HUB_MARGIN * s.sz;
  const { boxes, halos, segments } = aquariusObstacles(s);
  const aries = s.figures.get('planned');
  if (aries) {
    const paths = [
      ...aries.edges.filter((edge) => edge.bright),
      ...(aries.arcs ?? []).map((arc) => ({ a: arc.from, b: arc.at, ...arc })),
    ];
    for (const edge of paths) {
      const a = s.stars.get(aries.nodes[edge.a]!.id),
        b = s.stars.get(aries.nodes[edge.b]!.id);
      if (!a || !b || a.dead || b.dead || Math.min(a.alpha, b.alpha) < 0.1) continue;
      const p = s.at(a.x, a.y, 14),
        q = s.at(b.x, b.y, 14);
      const start = edge.start ? localPoint(p, q, edge.start) : p;
      const end = 'from' in edge ? localPoint(p, q, edge.end) : q;
      const control = edge.control ? localPoint(p, q, edge.control) : null;
      let previous = start;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12,
          u = 1 - t;
        const next: Point = control
          ? [
              u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
              u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
            ]
          : [start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])];
        segments.push({ a: previous, b: next, padding: 2 * s.sz });
        previous = next;
      }
    }
  }
  return {
    segments,
    boxes: [
      ...boxes,
      ...(s.hubLabelBoxes || []).flatMap((b) => b || []).map((b): Box => [b[0] - m, b[1] - m, b[2] + m, b[3] + m]),
      ...domBoxes(s),
      ...(withDone && s.sky && s.doneLabelBox ? [s.doneLabelBox] : []),
    ],
    halos: [
      ...halos,
      ...starHalos(s),
      ...(s.sky ? s.dipPos : []).map((point, k) => ({ id: `hub-${k}`, point, radius: HUB_STAR_KEEP * s.sz })),
    ],
  };
}
/** One alpha controls fill, outline and shadow together, including fully hidden labels. */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  alpha = 1,
  width?: number,
) {
  if (alpha <= 0 || ctx.globalAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(4,10,20,.98)';
  ctx.lineWidth = 3 * scale;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y, width);
  ctx.fillText(text, x, y, width);
  ctx.restore();
}
