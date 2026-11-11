import type { Point } from '../types';

export interface Particle {
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
}
export interface SoftBody {
  remainder: number;
  pin?: { particle: Particle; point: Point };
}
export const STEP = 1 / 120;
export const HOME = 180;
export const DAMPING = 16;
export const COMPLIANCE = 0.0012;
export const THROW_SPEED = 1400;
export const softBody = (): SoftBody => ({ remainder: 0 });
export const resetParticle = (p: Particle) => (p.ox = p.oy = p.vx = p.vy = 0);

export function launch(p: Particle, v: Point, scale = 1) {
  const k = Math.min(1 / scale, THROW_SPEED / (Math.hypot(...v) || 1));
  [p.vx, p.vy] = [v[0] * k, v[1] * k];
}

/** Compliant position constraints; compression has a shorter, softer rest distance (a slack rope). */
function solve({ a, b, compliance = COMPLIANCE, oneWay }: Constraint, pin?: Particle) {
  const hx = b.baseX! - a.baseX!,
    hy = b.baseY! - a.baseY!,
    rest = Math.hypot(hx, hy),
    dx = hx + b.ox - a.ox,
    dy = hy + b.oy - a.oy,
    length = Math.hypot(dx, dy);
  if (rest < 1) return;
  const stretch = Math.max(0, length / rest - 1),
    compressed = length < rest,
    error = compressed ? Math.min(0, length - rest * 0.65) : length - rest;
  const wa = a === pin || oneWay ? 0 : 1,
    wb = b === pin ? 0 : 1;
  const alpha = (compliance * (compressed ? 4 : 1)) / (1 + 6 * stretch * stretch) / STEP ** 2;
  // A hard bead separation prevents a compressed segment from turning inside out at coincidence.
  const correction = length < 18 ? (length - 18) / (wa + wb || 1) : error / (wa + wb + alpha),
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
      p.vx = (p.vx - HOME * p.ox * STEP) * Math.exp(-DAMPING * STEP);
      p.vy = (p.vy - HOME * p.oy * STEP) * Math.exp(-DAMPING * STEP);
      p.ox += p.vx * STEP;
      p.oy += p.vy * STEP;
    });
    if (pin && start) {
      const k = Math.min(1, elapsed / (duration || 1));
      pin.particle.ox = start[0] + (pin.point[0] - start[0]) * k;
      pin.particle.oy = start[1] + (pin.point[1] - start[1]) * k;
    }
    for (const edge of edges) solve(edge, pin?.particle);
    particles.forEach((p, i) => {
      p.vx = (p.ox - old[i]![0]) / STEP;
      p.vy = (p.oy - old[i]![1]) / STEP;
      if (p === pin?.particle) p.vx = p.vy = 0;
      else if (Math.hypot(p.ox, p.oy) < 0.015 && Math.hypot(p.vx, p.vy) < 0.1) resetParticle(p);
    });
    elapsed += STEP;
    body.remainder = Math.max(0, body.remainder - STEP);
  }
  if (pin) [pin.particle.ox, pin.particle.oy] = pin.point;
  body.pin = pin;
}
