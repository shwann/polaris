import { clearTooltip } from './tooltip';
import { constrain } from './motion/bounds';
import { cameraBounds, stopCamera } from './motion/cameraMotion';
import type { Box, Point, SkyState } from './types';
export const toWorld = (s: SkyState, X: number, Y: number): Point => [(X - s.cam.x) / s.cam.s, (Y - s.cam.y) / s.cam.s];
export const toScreen = (s: SkyState, x: number, y: number): Point => [x * s.cam.s + s.cam.x, y * s.cam.s + s.cam.y];
export const at = (s: SkyState, x: number, y: number, k: number): Point => [x + s.mx * k, y + s.my * k];
export function zoomTo(s: SkyState, X: number, Y: number, ns: number) {
  clearTooltip(s);
  stopCamera(s);
  ns = Math.min(5, Math.max(0.5, ns));
  s.camT.x = X - (X - s.camT.x) * (ns / s.camT.s);
  s.camT.y = Y - (Y - s.camT.y) * (ns / s.camT.s);
  s.camT.s = ns;
  if (s.sky) [s.camT.x, s.camT.y] = constrain([s.camT.x, s.camT.y], cameraBounds(s, ns));
}
export function reveal(s: SkyState, id: string, { zoom, area }: { zoom?: number; area?: Box } = {}) {
  const star = s.stars.get(id);
  if (!star) return false;
  clearTooltip(s);
  stopCamera(s);
  const [x, y] = s.at(star.x, star.y, 14),
    box = area || [s.w * 0.12, s.h * 0.12, s.w * 0.88, s.h * 0.78];
  if (zoom) s.camT.s = Math.min(5, Math.max(0.5, zoom));
  const sx = x * s.camT.s + s.camT.x,
    sy = y * s.camT.s + s.camT.y;
  if (zoom || sx < box[0]! || sx > box[2]! || sy < box[1]! || sy > box[3]!) {
    s.camT.x = (box[0]! + box[2]!) / 2 - x * s.camT.s;
    s.camT.y = (box[1]! + box[3]!) / 2 - y * s.camT.s;
  }
  star.flare = 1;
  return true;
}
