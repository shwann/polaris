import { layoutHomes } from './geometry/clusters';
import { cameraMoving } from './motion/cameraMotion';
import { spring } from './motion/spring';
import type { SkyState, Star } from './types';

export function physics(state: SkyState, t: number, dt: number, list: Star[]) {
  if (
    state.sky &&
    state.w > 560 &&
    state.layoutScale !== Math.max(0.5, Math.floor(Math.min(1, state.camT.s) * 10) / 10)
  )
    layoutHomes(state);
  const reduced = state.reduce.matches,
    d = state.drag;
  const root = d?.moved ? d.star : null;
  state.ripples = reduced ? [] : state.ripples.filter((r) => t - r.t0 < (r.small ? 650 : 1800));
  // Base positions have their own migration easing; offsets are never position-interpolated.
  for (const s of list) {
    const [hx, hy] = state.home(s, reduced ? 0 : t);
    s.baseX ??= s.x - s.ox;
    s.baseY ??= s.y - s.oy;
    const ease = reduced ? 1 : state.drag || cameraMoving(state) ? 0 : 1 - Math.exp(-dt / 348);
    s.baseX += (hx - s.baseX) * ease;
    s.baseY += (hy - s.baseY) * ease;
  }
  if (root && d && state.px > -1e3) {
    root.x = state.wpx - state.mx * 14 + d.grab[0];
    root.y = state.wpy - state.my * 14 + d.grab[1];
    root.ox = root.x - root.baseX!;
    root.oy = root.y - root.baseY!;
    root.vx = root.vy = 0;
  }
  for (const s of list) {
    if (s !== root) {
      const weight = !reduced && root && s.group === root.group ? d!.weights.get(s) || 0 : 0;
      const tx = root ? root.ox * weight : 0,
        ty = root ? root.oy * weight : 0;
      if (reduced) s.ox = s.oy = s.vx = s.vy = 0;
      else {
        // Ambient forces are disabled while manipulating a group.
        if (state.px > -1e3 && !d && Math.hypot(s.ox, s.oy) < 0.5 && Math.hypot(s.vx, s.vy) < 4) {
          const dx = state.wpx - state.mx * 14 - s.x,
            dy = state.wpy - state.my * 14 - s.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 180 && distance > 6) {
            const force = ((1 - distance / 180) * 180 * Math.min(dt, 48)) / 1000;
            s.vx += (dx / distance) * force;
            s.vy += (dy / distance) * force;
          }
        }
        for (const r of state.ripples) {
          if (r.small || r.hit.has(s) || d) continue;
          const radius = (Math.max(0, t - r.t0) / 1800) * Math.max(state.w, state.h) * 0.7;
          const dx = s.x - r.x,
            dy = s.y - r.y,
            distance = Math.hypot(dx, dy);
          if (Math.abs(distance - radius) < 18 && distance > 1) {
            r.hit.add(s);
            s.vx += (dx / distance) * 240 * r.power;
            s.vy += (dy / distance) * 240 * r.power;
            s.flare = Math.max(s.flare, 0.45);
          }
        }
        const x = spring(s.ox, s.vx, tx, dt),
          y = spring(s.oy, s.vy, ty, dt);
        s.ox = x.x;
        s.vx = x.v;
        s.oy = y.x;
        s.vy = y.v;
        if (!root && Math.hypot(s.ox, s.oy) < 0.02 && Math.hypot(s.vx, s.vy) < 0.1) s.ox = s.oy = s.vx = s.vy = 0;
      }
      s.x = s.baseX! + s.ox;
      s.y = s.baseY! + s.oy;
    }
    const veil = state.ZONE.dip && state.skyK < 0.5 && state.veilY > 0 && s.y < state.veilY - scrollY ? 0.18 : 1;
    s.alpha +=
      ((s.dead ? 0 : (state.match && !state.match.has(s.id) ? 0.14 : 1) * veil) - s.alpha) * (1 - Math.exp(-dt / 259));
    s.flare *= Math.exp(-dt / 632);
  }
  for (const [id, s] of state.stars)
    if (s.dead && s.alpha < 0.02) {
      state.stars.delete(id);
      state.rebuild();
    }
}
