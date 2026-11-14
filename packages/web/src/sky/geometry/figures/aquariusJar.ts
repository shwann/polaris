import type { Release } from '@polaris/core';
import type { Point } from '../../types';
import { addEdge, connect, distance, emptyFigure, randomFor, timestamp } from './common';
import { delaunay, inPoly, resample } from './triangulate';

// Fixed silhouette: tilted mouth, narrow neck, broad shoulders and a small foot.
export const JAR: Point[] = [
  [0.35, 0.02],
  [0.52, 0.18],
  [0.45, 0.21],
  [0.4, 0.3],
  [0.43, 0.42],
  [0.45, 0.57],
  [0.42, 0.73],
  [0.35, 0.84],
  [0.26, 0.9],
  [0.13, 0.9],
  [0.12, 0.99],
  [0.01, 0.88],
  [0.06, 0.83],
  [0.02, 0.65],
  [0.03, 0.48],
  [0.08, 0.34],
  [0.18, 0.24],
  [0.27, 0.21],
  [0.33, 0.22],
  [0.36, 0.14],
];

/** Keep the whole jar and water below Dubhe's caption, outside its Dipper links. */
export function aquariusFrame(w: number, h: number) {
  const tall = h > w * 1.15;
  return {
    x: w * (tall ? 0.69 : 0.76),
    y: h * (tall ? 0.5 : 0.7),
    w: w * (tall ? 0.29 : 0.22),
    h: h * (tall ? 0.25 : 0.24),
  };
}
export function aquariusPoint(point: Point, w: number, h: number): Point {
  const frame = aquariusFrame(w, h);
  return [frame.x + point[0] * frame.w, frame.y + point[1] * frame.h];
}
export const chronological = (releases: Release[]) =>
  [...releases].sort((a, b) => timestamp(a.releasedAt) - timestamp(b.releasedAt) || a.version.localeCompare(b.version));

/** No synthetic nodes: every slot is assigned exactly one delivered item. */
export function aquariusJar(releases: Release[], w: number, h: number) {
  const delivered = chronological(releases).flatMap((release) =>
    [...(release.items ?? [])]
      .sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.id.localeCompare(b.id))
      .map((item) => ({ item, release })),
  );
  const count = delivered.length,
    rim = Math.min(count, 22),
    f = emptyFigure();
  const poly = JAR.map((p) => aquariusPoint(p, w, h));
  const points = resample(poly, rim),
    rnd = randomFor(delivered.map((d) => d.item.id));
  const frame = aquariusFrame(w, h);
  let attempts = 0;
  while (points.length < count) {
    const p = aquariusPoint([0.02 + rnd() * 0.48, 0.05 + rnd() * 0.9], w, h);
    const gap = (Math.min(frame.w, frame.h) * 0.047) / (1 + Math.floor(attempts++ / 2000));
    if (inPoly(p, poly) && points.every((q) => distance(p, q) > gap)) points.push(p);
  }
  points.forEach((point, i) =>
    f.nodes.push({ id: '', point, bright: i < rim, slot: `${i < rim ? 'rim' : 'inner'}-${i}` }),
  );
  // A shared height order also preserves the chronology within each rim/interior set.
  const assigned = new Map<number, (typeof delivered)[number]>();
  const slots = f.nodes
    .map((node, i) => ({ node, i }))
    .sort((a, b) => b.node.point[1] - a.node.point[1] || a.node.point[0] - b.node.point[0]);
  slots.forEach(({ node, i }, j) => {
    const d = delivered[j]!;
    node.id = d.item.id;
    assigned.set(i, d);
  });
  for (let i = 0; i < rim; i++) addEdge(f, i, (i + 1) % rim, true);
  for (const t of delaunay(points)) {
    const centroid: Point = [
      t.reduce((sum, i) => sum + points[i]![0], 0) / 3,
      t.reduce((sum, i) => sum + points[i]![1], 0) / 3,
    ];
    if (!inPoly(centroid, poly)) continue;
    for (let i = 0; i < 3; i++) {
      const a = t[i]!,
        b = t[(i + 1) % 3]!;
      // Clip chords across the concave neck and foot, just as triangles are clipped.
      if (
        [0.25, 0.5, 0.75].every((k) =>
          inPoly([points[a]![0] * (1 - k) + points[b]![0] * k, points[a]![1] * (1 - k) + points[b]![1] * k], poly),
        )
      )
        addEdge(f, a, b, false);
    }
  }
  connect(f);
  const nodes = f.nodes.map((node, i) => ({ ...node, ...assigned.get(i)! }));
  const mouth = nodes
    .slice(0, rim)
    .reduce((best, node, i) => (distance(node.point, poly[1]!) < distance(nodes[best]!.point, poly[1]!) ? i : best), 0);
  return { nodes, edges: f.edges, poly, rim, mouth };
}
