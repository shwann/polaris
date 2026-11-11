import { DEPTH } from '../constants';
import { layerScale } from './chartGeometry';
import type { Box, Point, SkyState } from '../types';

/** Visible world rectangle for one independently translated background layer. */
export function layerView(w: number, h: number, scale: number, x: number, y: number): Box {
  return [-x / scale, -y / scale, (w - x) / scale, (h - y) / scale];
}
export function backgroundView(s: SkyState, depth: number): Box {
  return layerView(s.w, s.h, layerScale(s.cam.s, depth, s.skyK), s.cam.x * depth * s.skyK, s.cam.y * depth * s.skyK);
}

/** Include neighboring tiles whose soft clouds or drifting dust can cross a tile edge. */
export function tileOrigins(view: Box, w: number, h: number, margin = 0): Point[] {
  const out: Point[] = [];
  for (let y = Math.floor((view[1] - margin) / h); y <= Math.floor((view[3] + margin) / h); y++)
    for (let x = Math.floor((view[0] - margin) / w); x <= Math.floor((view[2] + margin) / w); x++)
      out.push([x * w, y * h]);
  return out;
}

export function drawBackgroundChart(s: SkyState) {
  if (!s.chart || !s.boardChart) return;
  const dx = s.mx * 3,
    dy = s.my * 3;
  if (s.skyK === 0) {
    s.ctx.drawImage(s.boardChart, dx, dy, s.w, s.h);
    return;
  }
  const view = backgroundView(s, DEPTH.chart),
    box = s.chartBox,
    x = Math.max(box[0], view[0] - dx),
    y = Math.max(box[1], view[1] - dy),
    right = Math.min(box[2], view[2] - dx),
    bottom = Math.min(box[3], view[3] - dy),
    rx = s.chart.width / (box[2] - box[0]),
    ry = s.chart.height / (box[3] - box[1]);
  if (right <= x || bottom <= y) return;
  s.ctx.drawImage(
    s.chart,
    (x - box[0]) * rx,
    (y - box[1]) * ry,
    (right - x) * rx,
    (bottom - y) * ry,
    x + dx,
    y + dy,
    right - x,
    bottom - y,
  );
  if (!s.chartCore) return;
  const cx = Math.max(0, view[0] - dx),
    cy = Math.max(0, view[1] - dy),
    cw = Math.min(s.w, view[2] - dx) - cx,
    ch = Math.min(s.h, view[3] - dy) - cy;
  if (cw > 0 && ch > 0)
    s.ctx.drawImage(
      s.chartCore,
      (cx * s.chartCore.width) / s.w,
      (cy * s.chartCore.height) / s.h,
      (cw * s.chartCore.width) / s.w,
      (ch * s.chartCore.height) / s.h,
      cx + dx,
      cy + dy,
      cw,
      ch,
    );
}
