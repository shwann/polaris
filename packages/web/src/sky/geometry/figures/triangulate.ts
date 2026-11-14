import type { Point } from '../../types';

export function inPoly([x, y]: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i]!,
      [d, e] = poly[j]!;
    if (b > y !== e > y && x < ((d - a) * (y - b)) / (e - b) + a) inside = !inside;
  }
  return inside;
}
export function resample(poly: Point[], count: number): Point[] {
  if (!count || !poly.length) return [];
  const lengths = poly.map((a, i) =>
    Math.hypot(a[0] - poly[(i + 1) % poly.length]![0], a[1] - poly[(i + 1) % poly.length]![1]),
  );
  const total = lengths.reduce((a, b) => a + b, 0);
  return Array.from({ length: count }, (_, k) => {
    let t = (k * total) / count,
      i = 0;
    while (i < lengths.length - 1 && t > lengths[i]!) t -= lengths[i++]!;
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!,
      f = t / (lengths[i] || 1);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  });
}
type Triangle = [number, number, number];
/** Bowyer-Watson with a finite supertriangle and a degeneracy guard for collinear input. */
export function delaunay(points: Point[]): Triangle[] {
  if (points.length < 3) return [];
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2,
    y = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) * 32;
  const n = points.length,
    vertices: Point[] = [...points, [x - span, y - span], [x + span, y - span], [x, y + span]];
  let triangles: Triangle[] = [[n, n + 1, n + 2]];
  function contains(t: Triangle, p: Point) {
    const [a, b, c] = t.map((i) => vertices[i]!) as [Point, Point, Point];
    const bx = b[0] - a[0],
      by = b[1] - a[1],
      cx = c[0] - a[0],
      cy = c[1] - a[1];
    const d = 2 * (bx * cy - by * cx);
    if (Math.abs(d) < 1e-12) return false;
    const u = ((bx * bx + by * by) * cy - (cx * cx + cy * cy) * by) / d;
    const v = ((cx * cx + cy * cy) * bx - (bx * bx + by * by) * cx) / d;
    return (p[0] - a[0] - u) ** 2 + (p[1] - a[1] - v) ** 2 <= u * u + v * v + 1e-9;
  }
  for (let p = 0; p < n; p++) {
    const boundary = new Map<string, { a: number; b: number; count: number }>(),
      keep: Triangle[] = [];
    for (const t of triangles) {
      if (!contains(t, vertices[p]!)) {
        keep.push(t);
        continue;
      }
      for (const [a, b] of [
        [t[0], t[1]],
        [t[1], t[2]],
        [t[2], t[0]],
      ] as [number, number][]) {
        const key = a < b ? `${a},${b}` : `${b},${a}`,
          edge = boundary.get(key);
        if (edge) edge.count++;
        else boundary.set(key, { a, b, count: 1 });
      }
    }
    for (const { a, b, count } of boundary.values()) if (count === 1) keep.push([a, b, p]);
    triangles = keep;
  }
  return triangles.filter((t) => t.every((i) => i < n));
}
