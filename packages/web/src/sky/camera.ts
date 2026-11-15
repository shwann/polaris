import { clearTooltip } from './tooltip';
import { clamp, constrain } from './motion/bounds';
import { cameraBounds, stopCamera } from './motion/cameraMotion';
import type { Box, Point, SkyState } from './types';
import { releaseStars } from './geometry/figures/aquarius';
import { MAX_ZOOM, MIN_ZOOM } from './constants';

export const clampZoom = (scale: number) => clamp(scale, MIN_ZOOM, MAX_ZOOM);
export const toWorld = (s: SkyState, X: number, Y: number): Point => [(X - s.cam.x) / s.cam.s, (Y - s.cam.y) / s.cam.s];
export const toScreen = (s: SkyState, x: number, y: number): Point => [x * s.cam.s + s.cam.x, y * s.cam.s + s.cam.y];
export const at = (s: SkyState, x: number, y: number, k: number): Point => [x + s.mx * k, y + s.my * k];
export function zoomTo(s: SkyState, X: number, Y: number, ns: number) {
  ns = clampZoom(ns);
  if (ns === s.camT.s) return;
  clearTooltip(s);
  stopCamera(s);
  const [x, y] = s.toWorld(X, Y);
  s.camT.x = X - x * ns;
  s.camT.y = Y - y * ns;
  s.camT.s = ns;
  if (s.sky) {
    s.cameraTravelBounds = cameraBounds(s, ns);
    [s.camT.x, s.camT.y] = constrain([s.camT.x, s.camT.y], s.cameraTravelBounds);
  }
}
export function reveal(s: SkyState, id: string, { zoom, area }: { zoom?: number; area?: Box } = {}) {
  if (s.deliveryVersion) releaseStars(s);
  const item = s.deliveryVersion ? s.aquarius?.jar.nodes.find((n) => n.id === id) : undefined;
  const star = s.stars.get(id);
  if (!star && !item) return false;
  clearTooltip(s);
  stopCamera(s);
  const [x, y] = item ? s.at(...item.point, 14) : s.at(star!.x, star!.y, 14),
    box = area || [s.w * 0.12, s.h * 0.12, s.w * 0.88, s.h * 0.78];
  if (zoom) s.camT.s = clampZoom(zoom);
  const sx = x * s.camT.s + s.camT.x,
    sy = y * s.camT.s + s.camT.y;
  if (zoom || sx < box[0]! || sx > box[2]! || sy < box[1]! || sy > box[3]!) {
    s.camT.x = (box[0]! + box[2]!) / 2 - x * s.camT.s;
    s.camT.y = (box[1]! + box[3]!) / 2 - y * s.camT.s;
  }
  if (star && !item) star.flare = 1;
  return true;
}
