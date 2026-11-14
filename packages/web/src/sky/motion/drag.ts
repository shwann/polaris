import { COL, COL_APP } from '../../domain/lanes';
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
  const body = d.release ? s.aquarius!.soft : s.soft,
    depth = d.star || d.release ? 14 : 0;
  d.grab = [p.baseX! + p.ox + s.mx * depth - wx, p.baseY! + p.oy + s.my * depth - wy];
  p.vx = p.vy = 0;
  body.recovery = [];
  body.releases?.clear();
  body.throws?.clear();
  body.pin = { particle: p, point: [p.ox, p.oy] };
}

export function releaseHeld(s: SkyState, d: Drag, e: PointerEvent) {
  const p = draggedParticle(s, d);
  if (!p) return;
  if (s.w > 560 && !s.reduce.matches && e.type !== 'pointercancel') {
    constellation(s, [...s.stars.values()], Math.max(0, e.timeStamp - (s.soft.time ?? s.last)), e.timeStamp);
  }
  const body = d.release ? s.aquarius!.soft : s.soft,
    point = e.type === 'pointercancel' ? undefined : moveHeld(s, d, e.clientX, e.clientY),
    restore = s.reduce.matches || (s.w > 560 && e.type === 'pointercancel');
  if (point) [p.ox, p.oy] = point;
  if (restore) resetParticle(p);
  else if (s.w <= 560 && !d.release) p.vx = p.vy = 0;
  else {
    const v = velocity(record(d.samples, { x: e.clientX, y: e.clientY, t: e.timeStamp }), e.timeStamp);
    // Slow star releases return immediately; a sub-frame launch must not creep past the pointer.
    const slow = (d.star || d.release) && Math.hypot(...v) / s.cam.s < THROW_FROM;
    // Only the water chain shares a fitted outline; satellites return to their own orbit homes.
    launch(
      p,
      slow ? [0, 0] : v,
      s.cam.s,
      body,
      d.release
        ? d.release.particle === d.release.star.particle
          ? s.aquarius!.stars.map((star) => star.particle)
          : [p]
        : d.star
          ? [...s.stars.values()].filter((star) => !star.dead && star.group === d.star!.group)
          : s.hubParticles,
    );
    if (d.release) {
      const versions = s.aquarius!.stars.map((star) => star.particle);
      body.recovery ??= [];
      if (p !== d.release.star.particle) body.recovery.push({ group: versions, root: d.release.star.particle, age: 0 });
      for (const star of s.aquarius!.stars)
        for (const satellite of star.satelliteParticles)
          if (satellite !== p) body.recovery.push({ group: [satellite], root: satellite, age: 0 });
    }
  }
  body.pin = undefined;
  if (d.release) {
    if (!s.reduce.matches && e.type !== 'pointercancel') {
      const [x, y] = s.at(p.baseX! + p.ox, p.baseY! + p.oy, 14);
      s.ripples.push({ x, y, c: COL_APP, t0: performance.now(), power: 0.8, small: true, hit: new Set() });
      if (s.ripples.length > 6) s.ripples.shift();
    }
    return;
  }
  if (!d.star) return;
  if (restore) [d.star.x, d.star.y] = [p.baseX!, p.baseY!];
  d.star.flare = Math.max(d.star.flare, 0.7);
  if (!s.reduce.matches && e.type !== 'pointercancel') {
    const [x, y] = s.at(d.star.x, d.star.y, 14);
    s.ripples.push({ x, y, c: COL[d.star.group], t0: performance.now(), power: 0.8, small: true, hit: new Set() });
    if (s.ripples.length > 6) s.ripples.shift();
  }
}
