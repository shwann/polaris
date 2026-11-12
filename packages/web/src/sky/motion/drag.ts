import { COL } from '../../domain/lanes';
import type { Drag, SkyState } from '../types';
import { constellation, draggedParticle, moveHeld, syncHubs } from './constellation';
import { mobileWeights } from './mobile';
import { record, velocity } from './inertia';
import { launch, resetParticle, THROW_FROM } from './softbody';

export function prepareDrag(s: SkyState, d: Drag, wx: number, wy: number) {
  if (!d.star && d.dip >= 0) s.soft.hubDrag = d.dip;
  syncHubs(s);
  if (s.w <= 560 && d.star && !s.reduce.matches)
    d.mobileWeights = mobileWeights(d.star, s.trees.get(d.star.group) || []);
  const p = draggedParticle(s, d);
  if (!p) return;
  if (d.star) {
    p.baseX ??= d.star.x - p.ox;
    p.baseY ??= d.star.y - p.oy;
  }
  const depth = d.star ? 14 : 0;
  d.grab = [p.baseX! + p.ox + s.mx * depth - wx, p.baseY! + p.oy + s.my * depth - wy];
  p.vx = p.vy = 0;
  s.soft.recovery = [];
  s.soft.releases?.clear();
  s.soft.throws?.clear();
  s.soft.pin = { particle: p, point: [p.ox, p.oy] };
}

export function releaseHeld(s: SkyState, d: Drag, e: PointerEvent) {
  const p = draggedParticle(s, d);
  if (!p) return;
  if (s.w > 560 && !s.reduce.matches && e.type !== 'pointercancel') {
    constellation(s, [...s.stars.values()], Math.max(0, e.timeStamp - (s.soft.time ?? s.last)), e.timeStamp);
  }
  const point = e.type === 'pointercancel' ? undefined : moveHeld(s, d, e.clientX, e.clientY),
    restore = s.reduce.matches || (s.w > 560 && e.type === 'pointercancel');
  if (point) [p.ox, p.oy] = point;
  if (restore) resetParticle(p);
  else if (s.w <= 560) p.vx = p.vy = 0;
  else {
    const v = velocity(record(d.samples, { x: e.clientX, y: e.clientY, t: e.timeStamp }), e.timeStamp);
    // Slow task releases return immediately; a sub-frame launch must not creep past the pointer.
    const slow = d.star && Math.hypot(...v) / s.cam.s < THROW_FROM;
    launch(
      p,
      slow ? [0, 0] : v,
      s.cam.s,
      s.soft,
      d.star ? [...s.stars.values()].filter((star) => !star.dead && star.group === d.star!.group) : s.hubParticles,
    );
  }
  s.soft.pin = undefined;
  if (!d.star) return;
  if (restore) [d.star.x, d.star.y] = [p.baseX!, p.baseY!];
  d.star.flare = Math.max(d.star.flare, 0.7);
  if (!s.reduce.matches && e.type !== 'pointercancel') {
    const [x, y] = s.at(d.star.x, d.star.y, 14);
    s.ripples.push({ x, y, c: COL[d.star.group], t0: performance.now(), power: 0.8, small: true, hit: new Set() });
    if (s.ripples.length > 6) s.ripples.shift();
  }
}
