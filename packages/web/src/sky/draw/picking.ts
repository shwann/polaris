import { COL } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState, Star } from '../types';

export const pickRadius = (scale: number) => Math.max(18, Math.min(36, 26 * scale ** 0.4));

/** Hit tests always use the task-star layer, including for a fresh touch with no hover frame. */
export function pickAt(state: SkyState, X: number, Y: number) {
  let star: Star | null = null,
    dip = -1,
    best = pickRadius(state.cam.s);
  for (const s of state.stars.values()) {
    if (s.dead || s.alpha < 0.02) continue;
    const [x, y] = state.toScreen(...state.at(s.x, s.y, 14));
    const distance = Math.hypot(X - x, Y - y);
    if (distance < best) {
      best = distance;
      star = s;
    }
  }
  let anchorRadius = star ? Math.min(best, 12) : pickRadius(state.cam.s);
  state.hubs().forEach(([x, y], index) => {
    const [sx, sy] = state.toScreen(x, y),
      distance = Math.hypot(X - sx, Y - sy);
    if (distance < anchorRadius) {
      anchorRadius = distance;
      dip = index;
    }
  });
  return { star: dip >= 0 ? null : star, dip };
}

export function drawPicking(state: SkyState, _t: number, list: Star[]) {
  const hit = state.onSky && !state.drag?.moved ? pickAt(state, state.px, state.py) : { star: null, dip: -1 };
  state.hover = state.drag?.star || hit.star;
  state.dipHover = hit.dip;
  if (state.px < -1e3 || state.drag?.moved) return;
  for (const s of list) {
    const [x, y] = state.at(s.x, s.y, 14),
      d = Math.hypot(x - state.wpx, y - state.wpy) * state.cam.s;
    if (d >= 170) continue;
    state.ctx.strokeStyle = rgba(COL[s.group]! || COL.planned, 0.3 * (1 - d / 170) * s.alpha);
    state.ctx.lineWidth = 0.6;
    state.ctx.beginPath();
    state.ctx.moveTo(state.wpx, state.wpy);
    state.ctx.lineTo(x, y);
    state.ctx.stroke();
  }
}
