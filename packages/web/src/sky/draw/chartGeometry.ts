import { DEPTH } from '../constants';
import { KEEP } from '../motion/bounds';
import type { Box } from '../types';

export const ZOOM_POWER = { chart: 0.35, nebula: 0.25, dust: 0.15, stars: 1 } as const;
export const CHART_PIXELS = 16 * 1024 * 1024;
export const BOARD_PIXELS = 8 * 1024 * 1024;
export const CHART_SIDE = 8192;
export const CHART_FADE = 64;
export const SOFT_PAN = 140;

/** Bound both backing-store area and sides, even for extreme aspect ratios. */
export function rasterSize(width: number, height: number, resolution: number, pixels: number) {
  const ratio = Math.min(resolution, Math.sqrt(pixels / (width * height)), CHART_SIDE / width, CHART_SIDE / height);
  return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)) };
}

export const layerScale = (scale: number, depth: number, sky = 1) => {
  const power = depth === DEPTH.chart ? ZOOM_POWER.chart : depth === DEPTH.nebula ? ZOOM_POWER.nebula : ZOOM_POWER.dust;
  return 1 + (scale ** (depth === DEPTH.stars ? 1 : power) - 1) * sky;
};

/** Conservative home envelope: one viewport beyond each edge, plus pointer parallax. */
export function chartGeometry(w: number, h: number, dpr: number) {
  const axis = (length: number) => {
    let lo = 0,
      hi = length;
    // (a + b*s) / s**k has no interior maximum for these positive a,b.
    for (const scale of [0.5, 5]) {
      const zoom = layerScale(scale, DEPTH.chart),
        maxPan = length * (1 - KEEP + scale) + SOFT_PAN + 7 * scale,
        minPan = length * (KEEP - 2 * scale) - SOFT_PAN - 7 * scale;
      lo = Math.min(lo, (-maxPan * DEPTH.chart) / zoom - 3);
      hi = Math.max(hi, (length - minPan * DEPTH.chart) / zoom + 3);
    }
    return [Math.floor(lo - CHART_FADE), Math.ceil(hi + CHART_FADE)] as const;
  };
  const [x0, x1] = axis(w),
    [y0, y1] = axis(h),
    width = x1 - x0,
    height = y1 - y0,
    raster = rasterSize(width, height, Math.min(dpr, 1.5), CHART_PIXELS);
  return { box: [x0, y0, x1, y1] as Box, ...raster };
}
