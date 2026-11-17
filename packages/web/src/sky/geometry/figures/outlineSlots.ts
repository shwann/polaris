import type { Point } from '../../types';

/** Occupied corners are connected in outline order; extra slots split its longest edges. */
export function outlineSlots(poly: Point[], count: number, priority: number[]): Point[] {
  const chosen = priority.slice(0, Math.min(count, poly.length)).sort((a, b) => a - b);
  const points = chosen.map((i): Point => [...poly[i]!]);
  while (points.length < count && points.length > 1) {
    let longest = 0;
    let length = -1;
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!;
      const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (distance > length) {
        longest = i;
        length = distance;
      }
    }
    const a = points[longest]!,
      b = points[(longest + 1) % points.length]!;
    points.splice(longest + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return points;
}
