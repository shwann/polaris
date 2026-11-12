import type { Point } from '../types';
import { MIN_SEPARATION, separate } from './separation';

export interface Particle {
  home?: number;
  damping?: number;
  baseX?: number;
  baseY?: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}
export interface Constraint {
  a: Particle;
  b: Particle;
  compliance?: number;
  oneWay?: boolean;
  stiffening?: number;
}
export interface SoftBody {
  remainder: number;
  hubDrag?: number;
  releases?: Map<Particle, number>;
  throws?: Map<Particle, number>;
  pin?: { particle: Particle; point: Point };
}
export const STEP = 1 / 120;
export const HOME = 36;
export const DAMPING = 6;
export const COMPLIANCE = 0.02;
export const THROW_SPEED = 1400;
export const THROW_WINDOW = 0.18;
export const THROW_HOME = 0.7;
export const THROW_FROM = 600;
export const THROW_COMPLIANCE = 12;
export const COMPRESSION = 0.8;
export const softBody = (): SoftBody => ({ remainder: 0 });
export const resetParticle = (p: Particle) => (p.ox = p.oy = p.vx = p.vy = 0);

export function launch(p: Particle, v: Point, scale = 1, body?: SoftBody, group: Particle[] = [p]) {
  const k = Math.min(1 / scale, THROW_SPEED / (Math.hypot(...v) || 1));
  [p.vx, p.vy] = [v[0] * k, v[1] * k];
  if (body) {
    body.releases ??= new Map();
    body.throws ??= new Map();
    if (Math.hypot(p.vx, p.vy) >= THROW_FROM && p.home === undefined) body.throws.set(p, 0);
    else body.throws.delete(p);
    for (const member of group) {
      if (Math.hypot(p.vx, p.vy) >= THROW_FROM) body.releases.set(member, 0);
      else body.releases.delete(member);
    }
  }
}

/** Compliant position constraints; compression has a shorter, softer rest distance (a slack rope). */
function solve({ a, b, compliance = COMPLIANCE, oneWay, stiffening = 6 }: Constraint, pin?: Particle, give = 1) {
  const hx = b.baseX! - a.baseX!,
    hy = b.baseY! - a.baseY!,
    rest = Math.hypot(hx, hy),
    dx = hx + b.ox - a.ox,
    dy = hy + b.oy - a.oy,
    length = Math.hypot(dx, dy);
  if (rest < 1) return;
  const stretch = Math.max(0, length / rest - 1),
    compressed = length < rest,
    error = compressed ? Math.min(0, length - rest * COMPRESSION) : length - rest;
  const wa = a === pin || oneWay ? 0 : 1,
    wb = b === pin ? 0 : 1;
  const alpha = (compliance * give * (compressed ? 4 : 1)) / (1 + stiffening * stretch * stretch) / STEP ** 2;
  // A hard bead separation prevents a compressed segment from turning inside out at coincidence.
  const correction = length < MIN_SEPARATION ? (length - MIN_SEPARATION) / (wa + wb || 1) : error / (wa + wb + alpha),
    nx = length > 1e-6 ? dx / length : hx / rest,
    ny = length > 1e-6 ? dy / length : hy / rest;
  a.ox += nx * correction * wa;
  a.oy += ny * correction * wa;
  b.ox -= nx * correction * wb;
  b.oy -= ny * correction * wb;
}

/** Fixed simulation clock, with interpolated pin targets so high-refresh frames do not inject impulses. */
export function advance(
  body: SoftBody,
  particles: Particle[],
  edges: Constraint[],
  dt: number,
  pin?: { particle: Particle; point: Point },
  groups: Particle[][] = [],
  minimum = MIN_SEPARATION,
) {
  const duration = Math.max(0, Math.min(dt / 1000, STEP * 4)),
    previous = body.pin?.particle === pin?.particle ? body.pin?.point : undefined,
    start: Point | undefined = pin ? previous || [pin.particle.ox, pin.particle.oy] : undefined;
  let elapsed = STEP - body.remainder;
  body.remainder += duration;
  const old = particles.map(() => [0, 0] as Point);
  while (body.remainder + 1e-10 >= STEP) {
    particles.forEach((p, i) => {
      old[i] = [p.ox, p.oy];
      const age = body.releases?.get(p),
        k = age === undefined ? 1 : Math.min(1, age / THROW_WINDOW),
        home = (p.home ?? HOME) * (THROW_HOME + (1 - THROW_HOME) * k * k * (3 - 2 * k));
      if (age !== undefined) {
        if (age + STEP >= THROW_WINDOW) body.releases!.delete(p);
        else body.releases!.set(p, age + STEP);
      }
      p.vx = (p.vx - home * p.ox * STEP) * Math.exp(-(p.damping ?? DAMPING) * STEP);
      p.vy = (p.vy - home * p.oy * STEP) * Math.exp(-(p.damping ?? DAMPING) * STEP);
      p.ox += p.vx * STEP;
      p.oy += p.vy * STEP;
    });
    if (pin && start) {
      const k = Math.min(1, elapsed / (duration || 1));
      pin.particle.ox = start[0] + (pin.point[0] - start[0]) * k;
      pin.particle.oy = start[1] + (pin.point[1] - start[1]) * k;
    }
    for (const edge of edges) {
      const age = Math.min(body.throws?.get(edge.a) ?? THROW_WINDOW, body.throws?.get(edge.b) ?? THROW_WINDOW);
      const k = Math.min(1, age / THROW_WINDOW);
      solve(edge, pin?.particle, 1 + (THROW_COMPLIANCE - 1) * (1 - k) ** 2);
    }
    for (const [p, age] of body.throws || []) {
      if (age + STEP >= THROW_WINDOW) body.throws!.delete(p);
      else body.throws!.set(p, age + STEP);
    }
    separate(groups, minimum, pin?.particle);
    particles.forEach((p, i) => {
      p.vx = (p.ox - old[i]![0]) / STEP;
      p.vy = (p.oy - old[i]![1]) / STEP;
      if (p === pin?.particle) p.vx = p.vy = 0;
      else if (Math.hypot(p.ox, p.oy) < 0.015 && Math.hypot(p.vx, p.vy) < 0.1) resetParticle(p);
    });
    elapsed += STEP;
    body.remainder = Math.max(0, body.remainder - STEP);
  }
  if (pin) {
    [pin.particle.ox, pin.particle.oy] = pin.point;
    separate(groups, minimum, pin.particle);
  }
  body.pin = pin;
}
