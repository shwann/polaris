import { DEPTH } from '../constants';
import { rgba } from '../palette';
import type { Box, Point, SkyState } from '../types';
import { backgroundView } from './background';

/** Only emit visible periodic copies, including particles crossing an edge. */
export function dustCopies(x: number, y: number, w: number, h: number, view: Box): Point[] {
  const out: Point[] = [];
  for (let ix = Math.ceil((view[0] - 1.3 - x) / w); ix <= Math.floor((view[2] - x) / w); ix++)
    for (let iy = Math.ceil((view[1] - 1.3 - y) / h); iy <= Math.floor((view[3] - y) / h); iy++)
      out.push([x + ix * w, y + iy * h]);
  return out;
}

export function drawDust(s: SkyState, t: number) {
  const view = backgroundView(s, DEPTH.dust);
  for (const d of s.dust) {
    const [x, y] = s.at(d.x, d.y, 4),
      points = dustCopies(x, y, s.w, s.h, view);
    if (!points.length) continue;
    const tw = 0.55 + 0.45 * Math.sin((t / 1300) * (0.5 + d.m) + d.ph);
    s.ctx.fillStyle = rgba(
      d.m < 0.14 ? [255, 214, 175] : d.m > 0.9 ? [215, 232, 255] : [150, 205, 255],
      (0.16 + d.m * 0.38) * tw,
    );
    const r = d.m > 0.93 ? 1.3 : 0.8;
    for (const [px, py] of points) s.ctx.fillRect(px, py, r, r);
  }
}
