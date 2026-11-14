import type { Point } from '../../types';
import { addEdge, connect, curve, emptyFigure, fitFigure, nearest, randomFor } from './common';
import type { FigureTask, Region } from './types';

const A: Point = [0.3, 0.22],
  B: Point = [0.78, 0.7],
  C: Point = [0.67, 0.33];
const control: Point = [2 * C[0] - (A[0] + B[0]) / 2, 2 * C[1] - (A[1] + B[1]) / 2];
export const bowPoint = (t: number): Point => [
  (1 - t) ** 2 * A[0] + 2 * t * (1 - t) * control[0] + t * t * B[0],
  (1 - t) ** 2 * A[1] + 2 * t * (1 - t) * control[1] + t * t * B[1],
];
export const SAGITTARIUS_SLOTS: Point[] = [
  [0.88, 0.12],
  A,
  B,
  C,
  [0.15, 0.85],
  [0.78, 0.14],
  [0.86, 0.24],
  [0.08, 0.8],
  [0.2, 0.92],
  [0.06, 0.9],
  bowPoint(0.25),
  bowPoint(0.75),
  [0.42, 0.34],
  [0.66, 0.58],
];

export function sagittarius(tasks: FigureTask[], region: Region) {
  const f = emptyFigure(),
    sorted = [...tasks].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0) || a.id.localeCompare(b.id));
  const rnd = randomFor(tasks.map((t) => t.id));
  sorted.forEach((task, i) => {
    const p: Point = SAGITTARIUS_SLOTS[i] ?? [0.27 + rnd() * 0.4, 0.3 + rnd() * 0.38];
    f.nodes.push({
      id: task.id,
      point: [...p],
      slot: ['tip', 'A', 'B', 'C', 'tail'][i] ?? `extra-${i}`,
      bright: i < 12,
      main: i === 0,
      size: i === 0 ? 1.65 : 1,
    });
  });
  const n = f.nodes.length;
  if (n > 3) addEdge(f, 3, 0, true);
  if (n > 4) addEdge(f, 4, 3, true);
  if (n > 2) addEdge(f, 1, 2, true, { alpha: 0.55 });
  // Split the quadratic at occupied bow slots; the grip is exactly its t=.5 point.
  const bow = [
    [1, 0],
    [10, 0.25],
    [3, 0.5],
    [11, 0.75],
    [2, 1],
  ].filter(([i]) => i! < n);
  for (let i = 1; i < bow.length; i++) {
    const [a, t0] = bow[i - 1]!,
      [b, t1] = bow[i]!;
    const p = bowPoint(t0!),
      dt = t1! - t0!;
    const cp: Point = [
      p[0] + dt * ((1 - t0!) * (control[0] - A[0]) + t0! * (B[0] - control[0])),
      p[1] + dt * ((1 - t0!) * (control[1] - A[1]) + t0! * (B[1] - control[1])),
    ];
    addEdge(f, a!, b!, true, { control: curve(f.nodes[a!]!.point, f.nodes[b!]!.point, cp) });
  }
  for (const i of [5, 6, 7, 8, 9]) if (i < n) addEdge(f, i, i < 7 ? 0 : 4, true);
  for (let i = 12; i < n; i++) {
    const p = f.nodes[i]!.point;
    addEdge(f, i, i < 14 ? 1 : nearest(f.nodes, p, i), false, i < 14 ? { end: [1, 2, 0.5] } : {});
  }
  return fitFigure(connect(f), region, [0.04, 0.1, 0.92, 0.94]);
}
