import { jarOutline } from '../geometry/figures/aquarius';
import { aquariusFrame } from '../geometry/figures/aquariusJar';
import type { Box, Point, SkyState } from '../types';
import { releaseCaption, waterBanks } from './releasePaths';
import type { Halo } from './labelObstacles';

export interface Segment {
  a: Point;
  b: Point;
  padding: number;
}
/** Clip a segment against the padded text rectangle, preserving space on either side of diagonal lines. */
export function hitsSegment(box: Box, { a, b, padding: p }: Segment) {
  let start = 0,
    end = 1;
  for (const axis of [0, 1] as const) {
    const delta = b[axis] - a[axis],
      low = box[axis]! - p,
      high = box[axis + 2]! + p;
    if (Math.abs(delta) < 1e-8) {
      if (a[axis] < low || a[axis] > high) return false;
    } else {
      const x = (low - a[axis]) / delta,
        y = (high - a[axis]) / delta;
      start = Math.max(start, Math.min(x, y));
      end = Math.min(end, Math.max(x, y));
      if (start > end) return false;
    }
  }
  return true;
}

/** The exact live rim and banks used by the painter, rather than a large box that hides the whole jar. */
export function aquariusObstacles(s: SkyState) {
  const body = s.sky && s.aquarius;
  const boxes: Box[] = [],
    segments: Segment[] = [],
    halos: Halo[] = [];
  if (!body || !body.stars.length) return { boxes, segments, halos };
  const at = (p: Point) => s.at(...p, 14),
    points = body.stars.map((n) => at(n.point)),
    frame = aquariusFrame(s.w, s.h),
    mouth = at(body.jar.nodes[body.jar.mouth]?.point ?? body.stars[0]!.point);
  const line = (points: Point[], close = false) => {
    for (let i = 1; i < points.length; i++) segments.push({ a: points[i - 1]!, b: points[i]!, padding: 1.5 * s.sz });
    if (close && points.length) segments.push({ a: points.at(-1)!, b: points[0]!, padding: 1.5 * s.sz });
  };
  line(jarOutline(body).map(at), true);
  line([mouth, points[0]!]);
  for (const bank of waterBanks([mouth, ...points], Math.max(5, frame.w * 0.018))) line(bank);
  const ctx = s.ctx;
  ctx.save();
  // The fixed overview captions are obstacles; zoomed captions join the shared label queue instead.
  if (s.cam.s <= 2.2) {
    const size = Math.max(12, s.unit * 0.009) * s.sz;
    ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    body.stars.forEach((n, i) => {
      const {
          point: [x, y],
          align,
        } = releaseCaption(points, i, s.sz),
        width = ctx.measureText(n.release.version).width;
      boxes.push([
        x - (align === 'right' ? width : 0) - 2 * s.sz,
        y - size - 2 * s.sz,
        x + (align === 'left' ? width : 0) + 2 * s.sz,
        y + size * 0.3,
      ]);
    });
  }
  const size = Math.max(12, s.unit * 0.01) * s.sz;
  ctx.font = `500 ${size}px "Noto Sans SC", sans-serif`;
  const width = ctx.measureText('水瓶 ♒︎ · 发布记录').width,
    [x, y] = at([frame.x + frame.w * 0.24, frame.y + frame.h + 23 * s.sz]);
  boxes.push([x - width / 2 - 2 * s.sz, y - size - 2 * s.sz, x + width / 2 + 2 * s.sz, y + size * 0.3]);
  ctx.restore();
  for (const n of body.jar.nodes) halos.push({ id: `aquarius-item:${n.id}`, point: at(n.point), radius: 4 * s.sz });
  for (const n of body.stars)
    halos.push({ id: `aquarius-release:${n.release.version}`, point: at(n.point), radius: (n.radius + 4) * s.sz });
  return { boxes, segments, halos };
}
