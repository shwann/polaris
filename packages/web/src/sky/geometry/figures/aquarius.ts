import type { Release } from '@polaris/core';
import type { Point, SkyState } from '../../types';
import { softBody, type Particle, type SoftBody } from '../../motion/softbody';
import { MIN_SEPARATION } from '../../motion/separation';

export const SATELLITE_RADIUS = 1.15;

export interface ReleaseStar {
  release: Release;
  point: Point;
  radius: number;
  alpha: number;
  satellites: Point[];
}

export interface AquariusStar extends ReleaseStar {
  particle: Particle;
  satelliteParticles: Particle[];
}
export interface AquariusBody {
  system: string;
  releases: Release[];
  w: number;
  h: number;
  stars: AquariusStar[];
  soft: SoftBody;
}
export interface ReleaseDrag {
  star: AquariusStar;
  particle: Particle;
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

/** Keep release particles separate from tasks while sharing one pose for drawing and picking. */
export function releaseStars(s: SkyState): AquariusStar[] {
  if (!s.sky) {
    s.aquarius = undefined;
    return [];
  }
  const previous = s.aquarius;
  if (
    !previous ||
    previous.system !== s.sysSel ||
    previous.releases !== s.releases ||
    previous.w !== s.w ||
    previous.h !== s.h
  ) {
    const retained = previous?.system === s.sysSel ? previous.stars : [];
    const at = (point: Point, p: Particle = { ox: 0, oy: 0, vx: 0, vy: 0 }) => {
      [p.baseX, p.baseY] = point;
      return p;
    };
    const stars = aquarius(s.releases, s.w, s.h).map((star): AquariusStar => {
      const old = retained.find((node) => node.release.version === star.release.version);
      return {
        ...star,
        particle: at(star.point, old?.particle),
        satelliteParticles: star.satellites.map((point, i) => at(point, old?.satelliteParticles[i])),
      };
    });
    const particles = stars.flatMap((star) => [star.particle, ...star.satelliteParticles]);
    // Tiny satellites use their visible radius, so a returning spoke cannot trap them across its parent.
    for (const star of stars)
      for (const satellite of star.satelliteParticles)
        satellite.separation = Math.min(
          MIN_SEPARATION,
          star.radius + SATELLITE_RADIUS,
          Math.hypot(satellite.baseX! - star.particle.baseX!, satellite.baseY! - star.particle.baseY!),
        );
    const sameTopology =
      previous?.system === s.sysSel &&
      stars.length === retained.length &&
      stars.every(
        (star, i) =>
          star.particle === retained[i]!.particle &&
          star.satelliteParticles.length === retained[i]!.satelliteParticles.length,
      );
    s.aquarius = {
      system: s.sysSel,
      releases: s.releases,
      w: s.w,
      h: s.h,
      stars,
      soft: sameTopology ? previous!.soft : softBody(),
    };
    if (s.drag?.release && !particles.includes(s.drag.release.particle)) {
      s.drag = null;
      s.pointers.clear();
    }
  }
  for (const star of s.aquarius!.stars) {
    const position = (p: Particle): Point => [p.baseX! + p.ox, p.baseY! + p.oy];
    star.point = position(star.particle);
    star.satellites = star.satelliteParticles.map(position);
  }
  return s.aquarius!.stars;
}

/** Version clicks and hover retain their original screen-space hit radius. */
export function pickRelease(s: SkyState, x: number, y: number): AquariusStar | null {
  let best = 16,
    hit: AquariusStar | null = null;
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

/** Satellites use a smaller hit area and never become selectable task stars. */
export function pickAquarius(s: SkyState, x: number, y: number): ReleaseDrag | null {
  const version = pickRelease(s, x, y);
  let hit: ReleaseDrag | null = version ? { star: version, particle: version.particle } : null;
  const p = version && s.toScreen(...s.at(...version.point, 14));
  let best = p ? Math.hypot(x - p[0], y - p[1]) : Infinity;
  for (const star of releaseStars(s))
    star.satellites.forEach((point, i) => {
      const p = s.toScreen(...s.at(...point, 14)),
        distance = Math.hypot(x - p[0], y - p[1]);
      if (distance < Math.min(best, 6)) {
        best = distance;
        hit = { star, particle: star.satelliteParticles[i]! };
      }
    });
  return hit;
}
