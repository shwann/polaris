import type { Release } from '@polaris/core';
import type { Point, SkyState } from '../../types';
import { softBody, type Particle, type SoftBody } from '../../motion/softbody';
import { MIN_SEPARATION } from '../../motion/separation';
import type { ReturnTiming } from '../../motion/returnTiming';
import { aquariusJar, aquariusPoint, chronological } from './aquariusJar';

export interface ReleaseStar {
  release: Release;
  point: Point;
  radius: number;
  alpha: number;
}
export interface AquariusStar extends ReleaseStar {
  particle: Particle;
}
export type JarStar = ReturnType<typeof aquariusJar>['nodes'][number] & { particle: Particle };
export interface AquariusBody {
  system: string;
  releases: Release[];
  w: number;
  h: number;
  stars: AquariusStar[];
  jar: Omit<ReturnType<typeof aquariusJar>, 'nodes'> & { nodes: JarStar[] };
  soft: SoftBody;
  returning?: {
    elapsed: number;
    end: number;
    steps: Map<Particle, { from: Point; velocity: Point; timing: ReturnTiming }>;
  };
}
export interface ReleaseDrag {
  star: AquariusStar | JarStar;
  particle: Particle;
}

/** Arc-length sampling keeps every release in chronological order through the falling water. */
export function aquarius(releases: Release[], w: number, h: number): ReleaseStar[] {
  const recent = chronological(releases);
  const controls: Point[] = [
    [0.55, 0.2],
    [0.61, 0.24],
    [0.64, 0.42],
    [0.78, 0.49],
    [0.81, 0.68],
    [0.9, 0.77],
    [0.92, 1.02],
  ].map((p) => aquariusPoint(p as Point, w, h));
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
    return {
      release,
      point,
      radius: i === recent.length - 1 ? 4.6 : 2.1 + progress * 1.3,
      alpha: 0.38 + progress * 0.62,
    };
  });
}

export const aquariusParticles = (body: AquariusBody) =>
  [...body.stars, ...body.jar.nodes].map((node) => node.particle);

/** Retain particle identity on refresh; the first pose is the finished silhouette. */
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
    const retained = previous?.system === s.sysSel ? previous : undefined;
    const at = (point: Point, p: Particle = { ox: 0, oy: 0, vx: 0, vy: 0 }) => {
      [p.baseX, p.baseY] = point;
      // Dense real records must not repel one another out of their resting silhouette.

      return p;
    };
    const stars = aquarius(s.releases, s.w, s.h).map((star) => ({
      ...star,
      particle: at(star.point, retained?.stars.find((node) => node.release.version === star.release.version)?.particle),
    }));
    const layout = aquariusJar(s.releases, s.w, s.h);
    const jar = {
      ...layout,
      nodes: layout.nodes.map((node) => ({
        ...node,
        particle: at(node.point, retained?.jar.nodes.find((old) => old.id === node.id)?.particle),
      })),
    };
    for (const node of jar.nodes) node.particle.separation = Math.min(MIN_SEPARATION, 2);
    const particles = [...stars, ...jar.nodes].map((node) => node.particle);
    const sameTopology =
      retained &&
      particles.length === aquariusParticles(retained).length &&
      particles.every((p, i) => p === aquariusParticles(retained)[i]);
    s.aquarius = {
      system: s.sysSel,
      releases: s.releases,
      w: s.w,
      h: s.h,
      stars,
      jar,
      soft: sameTopology ? retained.soft : softBody(),
      returning: sameTopology && retained.w === s.w && retained.h === s.h ? retained.returning : undefined,
    };
    if (s.drag?.release && !particles.includes(s.drag.release.particle)) {
      s.drag = null;
      s.pointers.clear();
    }
  }
  for (const node of [...s.aquarius!.stars, ...s.aquarius!.jar.nodes])
    node.point = [node.particle.baseX! + node.particle.ox, node.particle.baseY! + node.particle.oy];
  return s.aquarius!.stars;
}

/** Version hit radius and the 5px gesture threshold remain in screen coordinates. */
export function pickRelease(s: SkyState, x: number, y: number): AquariusStar | null {
  let best = 16,
    hit: AquariusStar | null = null;
  for (const star of releaseStars(s)) {
    const p = s.toScreen(...s.at(...star.point, 14)),
      distance = Math.hypot(x - p[0], y - p[1]);
    if (distance < best) {
      best = distance;
      hit = star;
    }
  }
  return hit;
}
export function pickAquarius(s: SkyState, x: number, y: number): ReleaseDrag | null {
  const version = pickRelease(s, x, y);
  let hit: ReleaseDrag | null = version ? { star: version, particle: version.particle } : null;
  const p = version && s.toScreen(...s.at(...version.point, 14));
  let best = p ? Math.hypot(x - p[0], y - p[1]) : Infinity;
  for (const node of s.aquarius?.jar.nodes ?? []) {
    const p = s.toScreen(...s.at(...node.point, 14)),
      distance = Math.hypot(x - p[0], y - p[1]);
    // Cover zoomed parallax drift without changing the screen-space gesture threshold.
    if (distance < Math.min(best, Math.max(8, Math.min(18, 8 * s.cam.s)))) {
      best = distance;
      hit = { star: node, particle: node.particle };
    }
  }
  return hit;
}

/** This is also the set used by the painter, so hover membership is directly testable. */
export function highlightedItems(s: SkyState) {
  return new Set(
    (s.aquarius?.jar.nodes ?? [])
      .filter((node) => node.release.version === (s.selectedRelease || s.hoverRelease?.release.version))
      .map((node) => node.id),
  );
}

/** Only live delivered-item nodes define the visible bottle boundary. */
export function jarOutline(body: AquariusBody): Point[] {
  return body.jar.nodes.slice(0, body.jar.rim).map((node) => node.point);
}
