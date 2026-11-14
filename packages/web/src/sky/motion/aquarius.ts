import { releaseStars } from '../geometry/figures/aquarius';
import type { SkyState } from '../types';
import { moveHeld } from './constellation';
import { advance, resetParticle, type Constraint } from './softbody';
import { MIN_SEPARATION } from './separation';

/** The same solver and defaults run on an isolated body with no physical tether to Dubhe. */
export function moveAquarius(s: SkyState, dt: number, time?: number) {
  const stars = releaseStars(s),
    body = s.aquarius?.soft;
  if (!body || !stars.length) return;
  const particles = stars.flatMap((star) => [star.particle, ...star.satelliteParticles]),
    d = s.drag?.moved && s.drag.release ? s.drag : undefined,
    particle = d?.release?.particle,
    point = d && moveHeld(s, d),
    edges: Constraint[] = [];
  stars.forEach((star, i) => {
    if (i) edges.push({ a: stars[i - 1]!.particle, b: star.particle });
    // A bending chord carries tension through a water bend without changing its resting shape.
    if (i > 1) edges.push({ a: stars[i - 2]!.particle, b: star.particle });
    for (const satellite of star.satelliteParticles)
      // Hanging satellites follow their version; pulling one also tensions its parent.
      edges.push({ a: star.particle, b: satellite, oneWay: satellite !== particle });
  });
  if (s.reduce.matches) {
    particles.forEach(resetParticle);
    if (particle && point) [particle.ox, particle.oy] = point;
    body.pin = undefined;
    body.remainder = 0;
  } else {
    const duration = time === undefined || body.time === undefined ? dt : Math.max(0, time - body.time);
    if (time !== undefined) body.time = Math.max(time, body.time ?? time);
    advance(
      body,
      particles,
      edges,
      duration,
      particle && point ? { particle, point } : undefined,
      [stars.map((star) => star.particle)],
      MIN_SEPARATION / s.cam.s,
    );
  }
  releaseStars(s);
}
