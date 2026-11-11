import { DEPTH } from '../constants';
import type { Box, Point, SkyState } from '../types';

/** Visible world rectangle for one independently translated background layer. */
export function layerView(w: number, h: number, scale: number, x: number, y: number): Box {
  return [-x / scale, -y / scale, (w - x) / scale, (h - y) / scale];
}
export function backgroundView(s: SkyState, depth: number): Box {
  return layerView(s.w, s.h, 1 + (s.cam.s - 1) * s.skyK, s.cam.x * depth * s.skyK, s.cam.y * depth * s.skyK);
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
  if (!s.chart || !s.chartPattern) return;
  const b = backgroundView(s, DEPTH.chart),
    dx = s.mx * 3,
    dy = s.my * 3;
  s.ctx.save();
  s.ctx.translate(dx, dy);
  // The cached tile is in device pixels; the layer transform remains in CSS pixels.
  s.ctx.scale(1 / s.dpr, 1 / s.dpr);
  s.ctx.fillStyle = s.chartPattern;
  s.ctx.fillRect((b[0] - dx) * s.dpr, (b[1] - dy) * s.dpr, (b[2] - b[0]) * s.dpr, (b[3] - b[1]) * s.dpr);
  s.ctx.restore();
}
