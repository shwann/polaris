import type { AquariusBody } from '../geometry/figures/aquarius';
import type { Point } from '../types';

/** Sample a smooth centreline before offsetting its normals into two parallel banks. */
export function waterBanks(points: Point[], width: number): [Point[], Point[]] {
  const samples: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)]!,
      b = points[i]!,
      c = points[i + 1]!,
      d = points[Math.min(points.length - 1, i + 2)]!;
    for (let j = 0; j < 16; j++) {
      const t = j / 16;
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
  if (points.length) samples.push(points.at(-1)!);
  return [-1, 1].map((side) =>
    samples.map((p, i): Point => {
      const a = samples[Math.max(0, i - 1)]!,
        b = samples[Math.min(samples.length - 1, i + 1)]!,
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy) || 1;
      return [p[0] - (dy / length) * width * side, p[1] + (dx / length) * width * side];
    }),
  ) as [Point[], Point[]];
}

/** Alternate labels along the local normal, including across almost horizontal bends. */
export function releaseCaption(points: Point[], i: number, scale: number) {
  const p = points[i]!,
    a = points[Math.max(0, i - 1)]!,
    b = points[Math.min(points.length - 1, i + 1)]!;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy) || 1;
  const side = i >= points.length - 2 ? 1 : i % 2 ? -1 : 1;
  const nx = (-dy / length) * side,
    ny = (dx / length) * side;
  return {
    point: [p[0] + nx * 17 * scale, p[1] + ny * 17 * scale + 4 * scale] as Point,
    align: nx > 0 ? ('left' as const) : ('right' as const),
  };
}

/** Version caption beside its release star, on the side away from the arc so it never sits inside a drop. */
export function dropCaption(body: AquariusBody, points: Point[], i: number, scale: number) {
  const p = points[i]!,
    [nx, ny] = body.drops!.normal[i] ?? [0, -1];
  return {
    point: [p[0] + nx * 13 * scale, p[1] + ny * 13 * scale + (ny < -0.5 ? 0 : 4 * scale)] as Point,
    align: nx < -0.2 ? ('right' as const) : ('left' as const),
  };
}

/** The caption the active style paints for release i, shared by the painter, label queue and obstacles. */
export const versionCaption = (body: AquariusBody, points: Point[], i: number, scale: number) =>
  body.drops ? dropCaption(body, points, i, scale) : releaseCaption(points, i, scale);
