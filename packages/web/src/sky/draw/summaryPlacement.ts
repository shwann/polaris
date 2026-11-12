import type { Box, Point } from '../types';
import { labelFits, type Halo } from './labelObstacles';

/** Prefer the outside of the cluster; search other baselines when viewport clamping brings it back in. */
export function placeSummary(
  bounds: Box,
  width: number,
  size: number,
  viewport: Point,
  halos: Halo[],
  boxes: Box[] = [],
) {
  const [w, h] = viewport,
    clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi)),
    xs = [bounds[0], bounds[2] + 16, bounds[0] - width - 16],
    ys = [
      bounds[1] - 16,
      bounds[3] + size + 16,
      ...halos.flatMap((p) => [p.point[1] - p.radius - 8, p.point[1] + p.radius + size + 8]),
    ];
  for (const y of ys)
    for (const x of xs) {
      const left = clamp(x, 12, w - width - 12),
        top = clamp(y, size + 16, h - 24);
      const box: Box = [left - 3, top - size - 3, left + width + 3, top + 3];
      if (labelFits(box, boxes, halos)) return { left, top, visible: true };
    }
  return { left: 12, top: size + 16, visible: false };
}
