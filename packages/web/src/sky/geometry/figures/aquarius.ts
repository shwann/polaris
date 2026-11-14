import type { Release } from '@polaris/core';
import type { Drag, Point, SkyState } from '../../types';
import { aquariusLayout, type AquariusLayout, type Delivery } from './aquariusLayout';
export type { ReleaseStar } from './aquariusLayout';

export const aquarius = (releases: Release[], w: number, h: number) => aquariusLayout(releases, w, h).stars;
const cache = new WeakMap<
  SkyState,
  { releases: Release[]; deliveries?: Delivery[]; w: number; h: number; layout: AquariusLayout }
>();
export function releaseFigure(s: SkyState) {
  let entry = cache.get(s);
  if (
    !entry ||
    entry.releases !== s.releases ||
    entry.deliveries !== s.deliveries ||
    entry.w !== s.w ||
    entry.h !== s.h
  ) {
    entry = {
      releases: s.releases,
      deliveries: s.deliveries,
      w: s.w,
      h: s.h,
      layout: aquariusLayout(s.releases, s.w, s.h, s.deliveries),
    };
    cache.set(s, entry);
  }
  return entry.layout;
}
export const releaseStars = (s: SkyState) => (s.sky ? releaseFigure(s).stars : []);
export const aquariusAt = (s: SkyState, [x, y]: Point, home = false): Point =>
  s.at(x + (home ? 0 : (s.aquariusOffset?.[0] ?? 0)), y + (home ? 0 : (s.aquariusOffset?.[1] ?? 0)), 14);

/** Decorative delivery dots never enter either the release or task hit test. */
export function pickRelease(s: SkyState, x: number, y: number) {
  let best = 16,
    hit: ReturnType<typeof aquarius>[number] | null = null;
  for (const star of releaseStars(s)) {
    const p = s.toScreen(...aquariusAt(s, star.point)),
      distance = Math.hypot(x - p[0], y - p[1]);
    if (distance < best) {
      best = distance;
      hit = star;
    }
  }
  return hit;
}
export function pickUrn(s: SkyState, x: number, y: number) {
  if (!s.sky || (!s.releases.length && !s.deliveries?.length)) return false;
  const f = releaseFigure(s);
  if (
    f.inner.some((p) => {
      const q = s.toScreen(...aquariusAt(s, p.point));
      return Math.hypot(x - q[0], y - q[1]) < 4;
    })
  )
    return false;
  return f.rim.some((p) => {
    const q = s.toScreen(...aquariusAt(s, p));
    return Math.hypot(x - q[0], y - q[1]) < 12;
  });
}
/** A single translation is the same rigid-shape constraint used by task constellations. */
export function moveAquarius(s: SkyState, d: Drag, x: number, y: number, cancel = false) {
  if (!d.aquarius) return;
  s.aquariusOffset = cancel
    ? [...d.aquarius]
    : [d.aquarius[0] + (x - d.x0) / s.cam.s, d.aquarius[1] + (y - d.y0) / s.cam.s];
}
