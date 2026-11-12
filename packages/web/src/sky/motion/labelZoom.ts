import type { SkyState } from '../types';

export const CAMERA_SNAP = 0.25;
export const TITLE_BAND = 0.4;

/** End the exponential camera tail at subpixel error, then commit all label choices in one frame. */
export function settleLabelZoom(s: SkyState) {
  if (!s.sky || s.w <= 560) {
    s.labelLayout = undefined;
    return;
  }
  const error = Math.max(
    Math.abs(s.cam.s - s.camT.s) * Math.max(s.w, s.h),
    Math.abs(s.cam.x - s.camT.x),
    Math.abs(s.cam.y - s.camT.y),
  );
  if (error <= CAMERA_SNAP) Object.assign(s.cam, s.camT);
  // Ambient pointer attraction never comes fully to rest; it must not postpone the zoom commit.
  const busy = !!s.drag;
  const bar = s.registry.get('skybar');
  const key = [
    s.camT.s,
    s.camT.x,
    s.camT.y,
    s.w,
    s.h,
    s.hover?.id,
    s.selected,
    s.match && [...s.match].join(','),
    bar?.top,
    bar?.width,
    ...[...s.stars.values()].map((p) => `${p.id}:${p.code}:${p.skyCode}:${p.title}:${p.group}:${p.dead}`),
  ].join('|');
  const settled = error <= CAMERA_SNAP && !busy;
  const previous = s.labelLayout;
  s.labelLayout = {
    key,
    settled,
    revision: (previous?.revision || 0) + (settled && (!previous?.settled || previous.key !== key) ? 1 : 0),
  };
}
