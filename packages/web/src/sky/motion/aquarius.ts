import { aquariusParticles, releaseStars, type AquariusBody } from '../geometry/figures/aquarius';
import type { Point, SkyState } from '../types';
import { moveHeld } from './constellation';
import { pushByRipple } from './ripple';
import { advance, resetParticle, THROW_SPEED, type Constraint, type Particle } from './softbody';
import { MIN_SEPARATION } from './separation';

export const RETURN_GLIDE = 980;
const RETURN_SPREAD = 900;
export const RETURN_SPLASH = 520;

export function returnAquarius(body: AquariusBody, root: Particle, velocity: Point, scale: number) {
  const jar = body.jar.nodes.map((node) => node.particle);
  const mouth = jar[body.jar.mouth];
  if (mouth) {
    const distance = (p: Particle) => Math.hypot(p.baseX! - mouth.baseX!, p.baseY! - mouth.baseY!);
    jar.sort((a, b) => distance(b) - distance(a));
  }
  const particles = [root, ...[...jar, ...body.stars.map((node) => node.particle)].filter((p) => p !== root)];
  const interval = Math.min(100, RETURN_SPREAD / Math.max(1, particles.length - 1));
  const speed = Math.hypot(...velocity);
  // Retain a little of a flick's momentum without sending the star far past the release point.
  const kick = Math.min(0.45 / scale, (THROW_SPEED * 0.25) / (speed || 1));
  body.returning = {
    elapsed: 0,
    lastDelay: (particles.length - 1) * interval,
    steps: new Map(
      particles.map((p, i) => [
        p,
        {
          from: [p.ox, p.oy],
          velocity: p === root ? [velocity[0] * kick, velocity[1] * kick] : [0, 0],
          delay: i * interval,
        },
      ]),
    ),
  };
}

function glideHome(body: AquariusBody, dt: number) {
  const returning = body.returning!;
  returning.elapsed += dt;
  for (const [p, { from, velocity, delay }] of returning.steps) {
    const k = Math.min(1, Math.max(0, (returning.elapsed - delay) / RETURN_GLIDE));
    const left = (1 - k) ** 2 * (1 + 2 * k);
    const carry = k * (1 - k) ** 2 * (RETURN_GLIDE / 1000);
    resetParticle(p);
    p.ox = from[0] * left + velocity[0] * carry;
    p.oy = from[1] * left + velocity[1] * carry;
  }
  if (returning.elapsed >= returning.lastDelay + RETURN_GLIDE + RETURN_SPLASH) body.returning = undefined;
}

/** The same solver and defaults run on an isolated body with no physical tether to Dubhe. */
export function moveAquarius(s: SkyState, dt: number, time?: number) {
  const stars = releaseStars(s),
    aquarius = s.aquarius;
  if (!aquarius || !stars.length) return;
  const body = aquarius.soft,
    particles = aquariusParticles(aquarius),
    d = s.drag?.moved && s.drag.release ? s.drag : undefined,
    particle = d?.release?.particle,
    point = d && moveHeld(s, d);
  if (s.reduce.matches || d) aquarius.returning = undefined;
  const duration = time === undefined || body.time === undefined ? dt : Math.max(0, time - body.time);
  if (time !== undefined) body.time = Math.max(time, body.time ?? time);
  if (aquarius.returning) {
    if (!s.drag?.release) glideHome(aquarius, duration);
    releaseStars(s);
    return;
  }
  const edges: Constraint[] = [];
  stars.forEach((star, i) => {
    if (i) edges.push({ a: stars[i - 1]!.particle, b: star.particle });
    // A bending chord carries tension through a water bend without changing its resting shape.
    if (i > 1) edges.push({ a: stars[i - 2]!.particle, b: star.particle });
  });
  const jar = aquarius.jar;
  for (const edge of jar.edges) edges.push({ a: jar.nodes[edge.a]!.particle, b: jar.nodes[edge.b]!.particle });
  if (jar.nodes.length && stars.length) edges.push({ a: jar.nodes[jar.mouth]!.particle, b: stars[0]!.particle });
  if (s.reduce.matches) {
    particles.forEach(resetParticle);
    if (particle && point) [particle.ox, particle.oy] = point;
    body.pin = undefined;
    body.remainder = 0;
  } else {
    if (!s.drag && time !== undefined && s.ripples.length) {
      for (const node of [...stars, ...jar.nodes]) pushByRipple(s, node.particle, s.at(...node.point, 14), time);
    }
    advance(
      body,
      particles,
      edges,
      duration,
      particle && point ? { particle, point } : undefined,
      [stars.map((star) => star.particle), jar.nodes.map((node) => node.particle)],
      MIN_SEPARATION / s.cam.s,
    );
  }
  releaseStars(s);
}
