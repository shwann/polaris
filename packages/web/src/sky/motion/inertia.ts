import type { Point } from '../types';

export interface Sample {
  x: number;
  y: number;
  t: number;
}
export const WINDOW_MS = 80;
export const STOP_SPEED = 12;
export const LAUNCH_SPEED = 90;
export const FRICTION_MS = 350;

export function record(samples: Sample[], sample: Sample): Sample[] {
  const start = samples.findIndex((p) => p.t >= sample.t - WINDOW_MS);
  return [...samples.slice(start < 0 ? -1 : Math.max(0, start - 1)), sample];
}

/** Integrate segment velocities with a recency ramp and actual time coverage. Units: px/s. */
export function velocity(samples: Sample[], now: number): Point {
  let x = 0,
    y = 0,
    weight = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!,
      b = samples[i]!;
    const start = Math.max(a.t, now - WINDOW_MS),
      end = Math.min(b.t, now);
    if (end <= start || b.t <= a.t) continue;
    const w = (end - start) * (1 + ((start + end) / 2 - now + WINDOW_MS) / WINDOW_MS);
    x += (((b.x - a.x) * 1000) / (b.t - a.t)) * w;
    y += (((b.y - a.y) * 1000) / (b.t - a.t)) * w;
    weight += w;
  }
  return weight ? [x / weight, y / weight] : [0, 0];
}

/** Exact exponential integration, including the sub-frame stop time. */
export function coast(v: Point, dt: number): { delta: Point; velocity: Point } {
  const speed = Math.hypot(...v);
  if (speed <= STOP_SPEED) return { delta: [0, 0], velocity: [0, 0] };
  const duration = Math.min(Math.max(0, dt), FRICTION_MS * Math.log(speed / STOP_SPEED));
  const decay = Math.exp(-duration / FRICTION_MS);
  return {
    delta: v.map((n) => ((n * FRICTION_MS) / 1000) * (1 - decay)) as Point,
    velocity: duration < dt || speed * decay <= STOP_SPEED + 1e-8 ? [0, 0] : (v.map((n) => n * decay) as Point),
  };
}
