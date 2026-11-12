import type { Point } from '../types';

// The widest resting halo is doing: MAG 3.6 × 5.5 × two radii = 39.6px.
export const STAR_SPACING = 40;

/** Stable local relaxation; an ordered nearest-free search guarantees the final minimum. */
export function separatePoints(input: Point[], minimum: number): Point[] {
  const points = input.map(([x, y]): Point => [x, y]);
  const distance = minimum + 1e-5;
  for (let step = 0; step < 100; step++) {
    let changed = false;
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]!,
          b = points[j]!;
        let dx = b[0] - a[0],
          dy = b[1] - a[1],
          d = Math.hypot(dx, dy);
        if (d >= distance) continue;
        if (d < 1e-9) {
          const angle = i * 2.39996 + j * 0.75488;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d = 1;
        }
        const push = (distance - Math.hypot(b[0] - a[0], b[1] - a[1])) / 2;
        a[0] -= (dx / d) * push;
        a[1] -= (dy / d) * push;
        b[0] += (dx / d) * push;
        b[1] += (dy / d) * push;
        changed = true;
      }
    if (!changed) break;
  }
  const placed: Point[] = [];
  for (const point of points) {
    const free = (p: Point) => placed.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= minimum);
    let candidate = point;
    for (let ring = 1; !free(candidate); ring++) {
      const radius = (ring * distance) / 4;
      for (let k = 0; k < 32; k++) {
        const angle = (k * Math.PI) / 16;
        candidate = [point[0] + Math.cos(angle) * radius, point[1] + Math.sin(angle) * radius];
        if (free(candidate)) break;
      }
    }
    placed.push(candidate);
  }
  // Preserve the original cluster centroid after local separation.
  const shift = [0, 1].map(
    (axis) => placed.reduce((sum, p, i) => sum + p[axis]! - input[i]![axis]!, 0) / (points.length || 1),
  );
  return placed.map(([x, y]) => [x - shift[0]!, y - shift[1]!] as Point);
}
