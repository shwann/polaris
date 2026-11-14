import { DIPPER_LINES } from '../../domain/lanes';
import type { Box, Point } from '../types';

/** Caption side codes: 1 right, -1 left, 0 below, 2 above. */
export type HubSide = -1 | 0 | 1 | 2;

/** Where a caption of the given size sits for each side; matches hubLabelAnchor's offsets. */
export function sideAnchor([x, y]: Point, side: number, k: number, sz: number) {
  const gap = (k === 7 ? 44 : 25) * sz; // clear of the Dipper star's longer sky-view spikes
  return {
    x: side === -1 || side === 1 ? x + side * gap : x,
    y: side === 0 ? y + 30 * sz : side === 2 ? y - 34 * sz : y - 2 * sz,
    align: (side === -1 ? 'right' : side === 1 ? 'left' : 'center') as CanvasTextAlign,
  };
}
/** Rough ink box of a caption block (first-line baseline at y, `height` of text below its cap line). */
export function sideBox(a: ReturnType<typeof sideAnchor>, width: number, ascent: number, height: number): Box {
  const left = a.align === 'left' ? a.x : a.align === 'right' ? a.x - width : a.x - width / 2;
  return [left - 3, a.y - ascent - 3, left + width + 3, a.y - ascent + height + 3];
}
/** Liang–Barsky: does segment a–b cross the box? */
export function segmentHitsBox([ax, ay]: Point, [bx, by]: Point, [x0, y0, x1, y1]: Box) {
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dy = by - ay;
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dy, ay - y0],
    [dy, y1 - ay],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}
/** The two (or three) dashed Dipper segments that meet at star k, including the pointer line to Polaris. */
export function adjacentSegments(points: Point[], k: number): [Point, Point][] {
  return [...DIPPER_LINES, [0, 7] as [number, number]]
    .filter(([a, b]) => a === k || b === k)
    .flatMap(([a, b]) => (points[a] && points[b] ? [[points[a], points[b]] as [Point, Point]] : []));
}
/** Optional task stars a caption keeps clear of: their points, the clearance (about one label height), the last side. */
export interface CaptionCrowd {
  stars?: Point[];
  keep?: number;
  last?: number;
}
/**
 * Keep the preferred side unless the caption would sit on one of the star's own Dipper lines or on task stars (within
 * `keep` of its box); then take the side that clears the lines with the fewest stars, staying on the last side while it
 * is clear so a slowly turning cluster does not make the caption hop. When no side clears the lines, keep the
 * preferred side and ask for a backdrop under the text.
 */
export function chooseHubSide(
  points: Point[],
  k: number,
  preferred: number,
  sz: number,
  size: { width: number; ascent: number; height: number } & CaptionCrowd,
): { side: number; backdrop: boolean } {
  const lines = adjacentSegments(points, k),
    keep = size.keep ?? 0,
    box = (side: number) => sideBox(sideAnchor(points[k]!, side, k, sz), size.width, size.ascent, size.height),
    clear = (side: number) => !lines.some(([a, b]) => segmentHitsBox(a, b, box(side))),
    crowd = (side: number) => {
      const [x0, y0, x1, y1] = box(side);
      return (size.stars ?? []).filter(([x, y]) => x > x0 - keep && x < x1 + keep && y > y0 - keep && y < y1 + keep)
        .length;
    };
  const sides = [preferred, 0, 2, 1, -1].filter(clear);
  if (!sides.length) return { side: preferred, backdrop: true };
  if (size.last !== undefined && sides.includes(size.last) && !crowd(size.last))
    return { side: size.last, backdrop: false };
  let best = sides[0]!,
    fewest = crowd(best);
  for (const side of sides.slice(1)) {
    if (!fewest) break;
    const n = crowd(side);
    if (n < fewest) [best, fewest] = [side, n];
  }
  return { side: best, backdrop: false };
}
