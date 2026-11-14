import type { Particle } from './softbody';
import type { Point, SkyState } from '../types';

const GLIDE = 1250;
const SPREAD = 450;
const LAST_GLIDE = 700;
const REMAINING = 0.45;
const SHORT_DRAG = 28;

export interface ReturnTiming {
  delay: number;
  duration: number;
  gather: number;
  provisional?: Point;
}

export function returnTimings(particles: Particle[], scale: number, correctPlacement = false) {
  // Keep the dragged star in the first group so it responds as soon as the pointer lifts.
  const last = particles
    .slice(1)
    .map((particle) => ({ particle, distance: Math.hypot(particle.ox, particle.oy) * scale }))
    .filter(({ distance }) => distance >= 12)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 3)
    .reverse()
    .map(({ particle }) => particle);
  const early = particles.filter((particle) => !last.includes(particle));
  const interval = Math.min(75, SPREAD / Math.max(1, early.length - 1));
  const end = GLIDE + Math.max(0, early.length - 1) * interval;
  return new Map<Particle, ReturnTiming>([
    ...early.map((p, i) => [p, { delay: i * interval, duration: GLIDE, gather: 0 }] as const),
    ...last.map(
      (p, i) =>
        [
          p,
          {
            delay: end + i * LAST_GLIDE,
            duration: LAST_GLIDE,
            gather: end,
            provisional: correctPlacement ? provisionalOffset(p, particles, scale) : undefined,
          },
        ] as const,
    ),
  ]);
}

export function figureReturnTimings(s: SkyState, key: string, particles: Particle[]) {
  const distance = Math.max(0, ...particles.map((p) => Math.hypot(p.ox, p.oy))) * s.cam.s;
  if (distance < SHORT_DRAG) {
    return new Map<Particle, ReturnTiming>(particles.map((p) => [p, { delay: 0, duration: 660, gather: 0 }]));
  }
  s.returnVariants ??= new Map();
  const correctPlacement = s.returnVariants.get(key) ?? false;
  const timings = returnTimings(particles, s.cam.s, correctPlacement);
  if ([...timings.values()].some(({ gather }) => gather > 0)) s.returnVariants.set(key, !correctPlacement);
  return timings;
}

/** Land partway toward a nearby slot so the silhouette reforms without stacking two stars at one point. */
function provisionalOffset(p: Particle, particles: Particle[], scale: number): Point | undefined {
  let nearest: Point | undefined;
  let gap = Infinity;
  const x0 = p.baseX!,
    y0 = p.baseY!;
  for (const other of particles) {
    if (other === p) continue;
    const x = other.baseX! - x0,
      y = other.baseY! - y0;
    const distance = Math.hypot(x, y);
    if (distance * scale < 16 || distance >= gap) continue;
    const fraction = Math.min(0.42, 18 / (distance * scale));
    const offset: Point = [x * fraction, y * fraction];
    if (
      particles.every((star) => Math.hypot(star.baseX! - x0 - offset[0], star.baseY! - y0 - offset[1]) * scale >= 5)
    ) {
      gap = distance;
      nearest = offset;
    }
  }
  return nearest;
}

export function returnProgress(elapsed: number, { delay, duration }: ReturnTiming) {
  return Math.min(1, Math.max(0, (elapsed - delay) / duration));
}

export function remainingOffset(elapsed: number, timing: ReturnTiming) {
  const ease = (k: number) => (1 - k) ** 2 * (1 + 2 * k);
  if (!timing.gather) return ease(returnProgress(elapsed, timing));
  if (elapsed < timing.gather) return REMAINING + (1 - REMAINING) * ease(elapsed / timing.gather);
  return REMAINING * ease(returnProgress(elapsed, timing));
}

export function returnOffset(from: Point, elapsed: number, timing: ReturnTiming): Point {
  const target = timing.provisional;
  if (!target) {
    const left = remainingOffset(elapsed, timing);
    return [from[0] * left, from[1] * left];
  }
  const gathering = elapsed < timing.gather;
  const k = gathering ? Math.max(0, elapsed / timing.gather) : returnProgress(elapsed, timing);
  const left = (1 - k) ** 2 * (1 + 2 * k);
  return gathering
    ? [target[0] + (from[0] - target[0]) * left, target[1] + (from[1] - target[1]) * left]
    : [target[0] * left, target[1] * left];
}
