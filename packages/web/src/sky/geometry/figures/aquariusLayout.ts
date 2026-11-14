import type { Release } from '@polaris/core';
import type { Point } from '../../types';
import { urnShape, URN } from './aquariusShape';
import { delaunay, inPoly } from './triangulate';

export interface Delivery {
  id: string;
  version: string;
}
export interface DeliveryPoint extends Delivery {
  point: Point;
  depth: number;
}
export interface ReleaseStar {
  release: Release;
  point: Point;
  radius: number;
  alpha: number;
  wave: number | null;
  sample: number;
  side: number;
}
export const orderedReleases = (releases: Release[]) =>
  [...releases].sort(
    (a, b) => Date.parse(a.releasedAt) - Date.parse(b.releasedAt) || a.version.localeCompare(b.version),
  );

/** Seeded jittered rows fill from the foot to the lip, keeping each release together. */
function pack(delivered: Delivery[], size: number) {
  const target = delivered.length;
  let slots: Point[] = [],
    gap = Math.min(15, Math.sqrt(19000 / Math.max(1, target)));
  const minimum = Math.max(3, size * 0.008);
  gap = Math.max(minimum, gap);
  for (;;) {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    slots = [];
    const step = gap / Math.max(1, size);
    for (let y = 0.95; y > 0.02; y -= step) {
      const row: Point[] = [],
        rowY = y + (random() - 0.5) * step * 0.22;
      for (let x = 0.13; x < 0.88; x += step / 0.8) {
        const p: Point = [x + (random() - 0.5) * step * 0.22, rowY];
        if (inPoly(p, URN) && URN.every((q) => Math.hypot((q[0] - p[0]) * 0.8, q[1] - p[1]) > step * 0.6)) row.push(p);
      }
      slots.push(...row.sort((a, b) => a[0] - b[0]));
    }
    if (slots.length >= target || gap <= minimum) break;
    gap = Math.max(minimum, gap * 0.8);
  }
  // Spread sparse deliveries through the entire vessel instead of stacking them at the foot.
  return {
    gap,
    slots: Array.from(
      { length: Math.min(target, slots.length) },
      (_, i) => slots[Math.floor(((i + 0.5) * slots.length) / Math.min(target, slots.length))]!,
    ),
  };
}

export function aquariusLayout(releases: Release[], w: number, h: number, deliveries?: Delivery[]) {
  const ordered = orderedReleases(releases),
    recent = ordered.slice(-12),
    shape = urnShape(w, h);
  const ranks = new Map(ordered.map((r, i) => [r.version, i]));
  const delivered = [
    ...new Map(
      (deliveries ?? ordered.flatMap((r) => (r.items ?? []).map(({ id }) => ({ id, version: r.version })))).map((d) => [
        d.id,
        d,
      ]),
    ).values(),
  ].sort(
    (a, b) =>
      (ranks.get(a.version) ?? -1) - (ranks.get(b.version) ?? -1) ||
      a.version.localeCompare(b.version, undefined, { numeric: true }) ||
      a.id.localeCompare(b.id),
  );
  const { slots, gap } = pack(delivered, shape.scale * 250);
  const inner: DeliveryPoint[] = slots.map((p, i) => ({ ...delivered[i]!, point: shape.transform(p), depth: p[1] }));
  const points = [...shape.rim, ...inner.map((p) => p.point)];
  const triangles = delaunay(points).filter((t) =>
    inPoly(
      [t.reduce((sum, i) => sum + points[i]![0], 0) / 3, t.reduce((sum, i) => sum + points[i]![1], 0) / 3],
      shape.rim,
    ),
  );
  let previousY = -Infinity;
  const stars: ReleaseStar[] = recent.map((release, i) => {
    const last = i === recent.length - 1,
      progress = i / Math.max(1, recent.length - 1);
    const wave = last ? null : i % 2;
    let sample = Math.round(6 + (i * 46) / Math.max(1, recent.length - 2));
    while (!last && sample < 59 && shape.waves[wave!]![sample]![1] <= previousY + 6 * shape.scale) sample++;
    const point = last ? shape.surface : shape.waves[wave!]![sample]!;
    previousY = point[1];
    return {
      release,
      wave,
      sample,
      side: wave === 0 ? -1 : 1,
      point,
      radius: last ? 5.2 : 2.3 + progress * 1.4,
      alpha: last ? 1 : 0.5 + progress * 0.45,
    };
  });
  return { ...shape, inner, points, triangles, stars, omitted: delivered.length - inner.length, gap };
}
export type AquariusLayout = ReturnType<typeof aquariusLayout>;
export const highlightedDeliveries = (layout: AquariusLayout, release?: Release) => {
  const ids = new Set(release?.items?.map((item) => item.id));
  return layout.inner.filter((p) => ids.has(p.id));
};
