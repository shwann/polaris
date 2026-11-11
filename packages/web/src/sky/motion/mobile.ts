import type { Star } from '../types';

/** Keep the existing mobile gesture response; the desktop soft-body change does not alter touch behavior. */
export function mobileWeights(root: Star, edges: [Star, Star][]) {
  const neighbors = new Map<Star, Star[]>();
  for (const [a, b] of edges) {
    neighbors.set(a, [...(neighbors.get(a) || []), b]);
    neighbors.set(b, [...(neighbors.get(b) || []), a]);
  }
  const weights = new Map<Star, number>([[root, 1]]),
    queue: [Star, number][] = [[root, 0]];
  for (let i = 0; i < queue.length; i++) {
    const [node, hops] = queue[i]!;
    for (const next of neighbors.get(node) || []) {
      if (weights.has(next)) continue;
      const distance = hops + 1;
      weights.set(next, distance === 1 ? 0.35 : distance === 2 ? 0.15 : 0.05);
      queue.push([next, distance]);
    }
  }
  return weights;
}
