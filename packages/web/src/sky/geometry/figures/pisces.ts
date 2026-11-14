import type { Point } from '../../types';
import { addEdge, connect, curve, distance, emptyFigure, fitFigure, nearest, randomFor, timestamp } from './common';
import { delaunay, inPoly, resample } from './triangulate';
import type { Figure, FigureTask, Region } from './types';

export const FISH: Point[] = [
  [0, 0.5],
  [0.08, 0.36],
  [0.22, 0.26],
  [0.4, 0.2],
  [0.56, 0.22],
  [0.68, 0.3],
  [0.78, 0.42],
  [0.98, 0.18],
  [0.9, 0.5],
  [0.98, 0.82],
  [0.78, 0.58],
  [0.68, 0.7],
  [0.56, 0.78],
  [0.4, 0.8],
  [0.22, 0.74],
  [0.08, 0.64],
];
const FIXED: Point[] = [
  [0.18, 0.44],
  [0.42, 0.3],
  [0.42, 0.7],
  [0.6, 0.5],
];
const transform = ([x, y]: Point, flip: boolean): Point => {
  const dx = (flip ? 1 - x : x) - 0.5,
    dy = y - 0.5,
    a = -0.35;
  return [
    (flip ? 440 : 250) + (dx * Math.cos(a) - dy * Math.sin(a)) * 260,
    (flip ? 250 : 120) + (dx * Math.sin(a) + dy * Math.cos(a)) * 260 * 0.62,
  ];
};
function fish(f: Figure, count: number, flip: boolean, rnd: () => number) {
  const poly = FISH.map((p) => transform(p, flip)),
    rim = Math.min(18, count),
    offset = f.nodes.length;
  const points = resample(poly, rim);
  for (const p of FIXED.map((p) => transform(p, flip))) if (points.length < count) points.push(p);
  const xs = poly.map((p) => p[0]),
    ys = poly.map((p) => p[1]);
  const bounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  let attempts = 0;
  while (points.length < count) {
    const p: Point = [bounds[0]! + rnd() * (bounds[2]! - bounds[0]!), bounds[1]! + rnd() * (bounds[3]! - bounds[1]!)];
    // Gradually relax spacing for very large groups, always staying inside the polygon.
    const gap = 15 / (1 + Math.floor(attempts++ / 2000));
    if (inPoly(p, poly) && points.every((q) => distance(p, q) > gap)) points.push(p);
  }
  points.forEach((point, i) =>
    f.nodes.push({
      id: '',
      point,
      slot: `${flip ? 'B' : 'A'}-${i < rim ? 'rim' : 'inner'}-${i < rim ? i : i - rim}`,
      bright: i < rim,
    }),
  );
  for (let i = 0; i < rim; i++) addEdge(f, offset + i, offset + ((i + 1) % rim), true);
  for (const t of delaunay(points)) {
    const centroid: Point = [
      t.reduce((s, i) => s + points[i]![0], 0) / 3,
      t.reduce((s, i) => s + points[i]![1], 0) / 3,
    ];
    if (!inPoly(centroid, poly)) continue;
    for (let i = 0; i < 3; i++) addEdge(f, offset + t[i]!, offset + t[(i + 1) % 3]!, false);
  }
  if (count) {
    const tail = transform([0.9, 0.5], flip),
      i = offset + nearest(f.nodes.slice(offset, offset + count), tail);
    const knot = f.nodes[0]!.point,
      p = f.nodes[i]!.point;
    addEdge(f, i, 0, true, { control: curve(p, knot, flip ? [660, 200] : [520, 40]), start: curve(p, knot, tail) });
  }
}
export function pisces(tasks: FigureTask[], region: Region) {
  const f = emptyFigure();
  if (!tasks.length) return f;
  const sorted = [...tasks].sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt) || a.id.localeCompare(b.id));
  f.nodes.push({ id: sorted.shift()!.id, point: [600, 90], slot: 'knot', bright: true, main: true, size: 1.7 });
  const rnd = randomFor(tasks.map((t) => t.id)),
    half = Math.ceil(sorted.length / 2);
  fish(f, half, false, rnd);
  fish(f, sorted.length - half, true, rnd);
  // Alternate fish and fill both rims before their interiors. Recent completions take those slots first.
  const slots = f.nodes
    .slice(1)
    .sort(
      (a, b) =>
        Number(b.bright) - Number(a.bright) ||
        Number(a.slot.split('-').at(-1)) - Number(b.slot.split('-').at(-1)) ||
        a.slot.localeCompare(b.slot),
    );
  sorted.sort(
    (a, b) =>
      Number(!!b.recent) - Number(!!a.recent) ||
      timestamp(b.updatedAt) - timestamp(a.updatedAt) ||
      a.id.localeCompare(b.id),
  );
  slots.forEach((node, i) => (node.id = sorted[i]!.id));
  return fitFigure(connect(f), region, [110, 30, 660, 330]);
}
