import type { Box, Point } from '../../types';
import type { Figure, FigureEdge, FigureNode, Region } from './types';

export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const timestamp = (s?: string) => (s && Number.isFinite(Date.parse(s)) ? Date.parse(s) : 0);
export const emptyFigure = (): Figure => ({ nodes: [], edges: [] });
export function randomFor(ids: string[]) {
  let seed = 23;
  for (const c of [...ids].sort().join('|')) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function nearest(nodes: FigureNode[], p: Point, limit = nodes.length) {
  let best = 0;
  for (let i = 1; i < limit; i++) if (distance(nodes[i]!.point, p) < distance(nodes[best]!.point, p)) best = i;
  return best;
}
/** Repair only disconnected components left by omitted slots or clipped triangles. */
export function connect(figure: Figure) {
  const { nodes, edges } = figure;
  const roots = nodes.map((_, i) => i);
  const root = (i: number): number => (roots[i] === i ? i : (roots[i] = root(roots[i]!)));
  for (const e of edges) roots[root(e.a)] = root(e.b);
  while (nodes.some((_, i) => root(i) !== root(0))) {
    let a = 0,
      b = 0,
      best = Infinity;
    nodes.forEach((p, i) =>
      nodes.forEach((q, j) => {
        if (root(i) === root(j)) return;
        const d = distance(p.point, q.point);
        if (d < best) [a, b, best] = [i, j, d];
      }),
    );
    edges.push({ a, b, bright: nodes[a]!.bright && nodes[b]!.bright });
    roots[root(a)] = root(b);
  }
  return figure;
}
export function fitFigure(figure: Figure, [cx, cy, r]: Region, [x0, y0, x1, y1]: Box) {
  const scale = Math.min((2.5 * r) / (x1 - x0), (1.7 * r) / (y1 - y0));
  for (const n of figure.nodes)
    n.point = [cx + (n.point[0] - (x0 + x1) / 2) * scale, cy + (n.point[1] - (y0 + y1) / 2) * scale];
  return figure;
}
/** Express a control point in a basis that follows its stars while dragging. */
export function curve(a: Point, b: Point, c: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = dx * dx + dy * dy || 1;
  const x = c[0] - (a[0] + b[0]) / 2,
    y = c[1] - (a[1] + b[1]) / 2;
  return [(x * dx + y * dy) / d, (y * dx - x * dy) / d];
}
export function addEdge(f: Figure, a: number, b: number, bright: boolean, options: Partial<FigureEdge> = {}) {
  if (a < 0 || b < 0 || a === b) return;
  if (!f.edges.some((e) => ((e.a === a && e.b === b) || (e.a === b && e.b === a)) && !!e.control === !!options.control))
    f.edges.push({ a, b, bright, ...options });
}
