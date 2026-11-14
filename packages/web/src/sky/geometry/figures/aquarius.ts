import type { Release } from '@polaris/core';
import type { Point, SkyState } from '../../types';

export interface ReleaseStar {
  release: Release;
  point: Point;
  radius: number;
  alpha: number;
  satellites: Point[];
}

/** Arc-length sampling keeps releases evenly spaced through three bends of falling water. */
export function aquarius(releases: Release[], w: number, h: number): ReleaseStar[] {
  const recent = [...releases]
    .sort((a, b) => Date.parse(a.releasedAt) - Date.parse(b.releasedAt) || a.version.localeCompare(b.version))
    .slice(-12);
  const tall = h > w * 1.15;
  // This patch is below Scorpius and beyond Dubhe's bowl, clear of the six task figures.
  const controls: Point[] = (
    tall
      ? [
          [0.74, 0.49],
          [0.91, 0.55],
          [0.75, 0.61],
          [0.9, 0.67],
          [0.78, 0.74],
        ]
      : [
          [0.82, 0.61],
          [0.91, 0.66],
          [0.84, 0.74],
          [0.94, 0.8],
          [0.88, 0.89],
        ]
  ).map(([x, y]) => [x! * w, y! * h]);
  const samples: Point[] = [];
  for (let i = 0; i < controls.length - 1; i++) {
    const a = controls[Math.max(0, i - 1)]!,
      b = controls[i]!,
      c = controls[i + 1]!,
      d = controls[Math.min(controls.length - 1, i + 2)]!;
    for (let j = 0; j <= 24; j++) {
      const t = j / 24;
      samples.push(
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * b[k]! +
              (-a[k]! + c[k]!) * t +
              (2 * a[k]! - 5 * b[k]! + 4 * c[k]! - d[k]!) * t * t +
              (-a[k]! + 3 * b[k]! - 3 * c[k]! + d[k]!) * t * t * t),
        ) as Point,
      );
    }
  }
  const lengths = [0];
  for (let i = 1; i < samples.length; i++)
    lengths.push(
      lengths[i - 1]! + Math.hypot(samples[i]![0] - samples[i - 1]![0], samples[i]![1] - samples[i - 1]![1]),
    );
  return recent.map((release, i) => {
    const progress = recent.length === 1 ? 1 : i / (recent.length - 1);
    const target = lengths.at(-1)! * progress;
    const index = Math.max(
      1,
      lengths.findIndex((n) => n >= target),
    );
    const a = samples[index - 1]!,
      b = samples[index]!;
    const k = (target - lengths[index - 1]!) / (lengths[index]! - lengths[index - 1]! || 1);
    const point: Point = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const count = Math.min(8, release.items?.length ?? release.stats?.items ?? 0);
    const orbit = Math.max(8, Math.min(24, w * 0.012));
    return {
      release,
      point,
      radius: i === recent.length - 1 ? 4.6 : 2.1 + progress * 1.3,
      alpha: 0.38 + progress * 0.62,
      satellites: Array.from({ length: count }, (_, j): Point => {
        const angle = (j * Math.PI * 2) / count + i * 0.7;
        const r = orbit * (j % 2 ? 0.8 : 1);
        return [point[0] + Math.cos(angle) * r, point[1] + Math.sin(angle) * r];
      }),
    };
  });
}

export const releaseStars = (s: SkyState) => (s.sky ? aquarius(s.releases ?? [], s.w, s.h) : []);

/** Decorative satellites never enter this hit test or the task-star collection. */
export function pickRelease(s: SkyState, x: number, y: number): ReleaseStar | null {
  let best = 16,
    hit: ReleaseStar | null = null;
  for (const star of releaseStars(s)) {
    const p = s.toScreen(...s.at(...star.point, 14));
    const distance = Math.hypot(x - p[0], y - p[1]);
    if (distance < best) {
      best = distance;
      hit = star;
    }
  }
  return hit;
}
