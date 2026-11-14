import type { Point, SkyState } from '../types';
import type { Particle } from './softbody';

/** A passing wave pushes each particle at most once. */
export function pushByRipple(s: SkyState, p: Particle, [x, y]: Point, t: number) {
  let hit = false;
  for (const r of s.ripples) {
    if (r.small || r.hit.has(p)) continue;
    const radius = (Math.max(0, t - r.t0) / 1800) * Math.max(s.w, s.h) * 0.7;
    const dx = x - r.x,
      dy = y - r.y,
      distance = Math.hypot(dx, dy);
    if (Math.abs(distance - radius) < 18 && distance > 1) {
      r.hit.add(p);
      p.vx += (dx / distance) * 240 * r.power;
      p.vy += (dy / distance) * 240 * r.power;
      hit = true;
    }
  }
  return hit;
}
