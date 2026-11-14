import { describe, expect, it } from 'vitest';
import { figureFor } from './index';
import { SCORPIUS_OMIT, scorpius } from './scorpius';
import { bowPoint, sagittarius } from './sagittarius';
import { pisces } from './pisces';
import { delaunay, inPoly, resample } from './triangulate';
import type { Figure, FigureTask } from './types';
import type { Lane } from '../../../domain/types';
import type { Point } from '../../types';

const tasks = (n: number): FigureTask[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `task-${String(i).padStart(3, '0')}`,
    updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
    progress: i,
  }));
function connected(f: Figure, n: number) {
  expect(f.nodes).toHaveLength(n);
  expect(new Set(f.nodes.map((p) => p.id)).size).toBe(n);
  if (!n) return;
  const seen = new Set([0]);
  for (let i = 0; i < n; i++)
    for (const e of f.edges) {
      expect(e.a).toBeLessThan(n);
      expect(e.b).toBeLessThan(n);
      if (seen.has(e.a)) seen.add(e.b);
      if (seen.has(e.b)) seen.add(e.a);
    }
  expect(seen.size).toBe(n);
  for (const p of f.nodes) expect(p.point.every(Number.isFinite)).toBe(true);
  expect(f.nodes.filter((p) => p.main)).toHaveLength(1);
}
for (const [lane, counts] of [
  ['waiting', [0, 1, 2, 10, 18, 19, 27]],
  ['doing', [0, 1, 2, 4, 5, 14, 28]],
  ['done', [0, 1, 2, 12, 37, 69, 110]],
] as [Lane, number[]][]) {
  describe(lane, () => {
    it.each(counts)('connects every star for count %i', (n) => {
      const input = tasks(n),
        original = structuredClone(input),
        f = figureFor(lane, input, [10, 20, 100])!;
      connected(f, n);
      expect(input).toEqual(original);
      expect(f).toEqual(figureFor(lane, [...input].reverse(), [10, 20, 100]));
      for (const node of f.nodes.filter((p) => !p.bright))
        if (n > 1)
          expect(f.edges.some((e) => e.a === f.nodes.indexOf(node) || e.b === f.nodes.indexOf(node))).toBe(true);
    });
  });
}
it('omits skeleton slots by user count while protecting both claws and three tail joints', () => {
  for (let n = 11; n <= 15; n++) {
    const f = scorpius(tasks(n), [0, 0, 100]),
      omitted = SCORPIUS_OMIT.slice(0, 15 - n);
    for (const slot of omitted) expect(f.nodes.some((p) => p.slot === slot)).toBe(false);
    for (const slot of ['heart', 'A', 'C', 'UJ1', 'UJ2', 'LJ1', 'LJ2', 'T1', 'T2', 'T3'])
      expect(f.nodes.some((p) => p.slot === slot)).toBe(true);
    expect(f.spur?.at).toBe(f.nodes.findLastIndex((p) => /^(T[1-4]|S)$/.test(p.slot)));
  }
});
it('puts the oldest user wait in the heart and external waits on dim legs', () => {
  const input = tasks(19).map((t, i) => ({
    ...t,
    waitingOn: i < 4 ? ((i % 2 ? 'dependency' : 'customer') as 'dependency' | 'customer') : undefined,
    waitingSince: i === 9 ? '2000-01-01' : t.updatedAt,
  }));
  const f = scorpius(input, [0, 0, 100]);
  expect(f.nodes.find((n) => n.main)?.id).toBe(input[9]!.id);
  for (const t of input.slice(0, 4)) {
    const node = f.nodes.find((n) => n.id === t.id)!;
    expect(node.slot).toMatch(/^L[1-4]$/);
    expect(node.bright).toBe(false);
  }
});
it('keeps external-only waiting groups connected and dim, with one main star', () => {
  for (const n of [1, 2, 4, 10, 19, 30]) {
    const f = scorpius(
      tasks(n).map((t) => ({ ...t, waitingOn: 'customer' })),
      [0, 0, 100],
    );
    connected(f, n);
    expect(f.nodes.every((p) => !p.bright)).toBe(true);
  }
});
it('makes every scorpion overflow star dim', () => {
  const f = scorpius(tasks(30), [0, 0, 100]);
  expect(f.nodes.filter((n) => n.slot.startsWith('extra-'))).toHaveLength(15);
  expect(f.nodes.filter((n) => n.slot.startsWith('extra-')).every((n) => !n.bright)).toBe(true);
});
it('uses progress for the arrow tip and fills optional slots in order', () => {
  const input = tasks(28),
    f = sagittarius(input, [0, 0, 100]);
  expect(f.nodes[0]!.id).toBe(input[27]!.id);
  expect(f.nodes.slice(14).every((n) => !n.bright)).toBe(true);
  for (let n = 1; n <= 14; n++)
    expect(sagittarius(input.slice(0, n), [0, 0, 100]).nodes.map((p) => p.slot)).toEqual(
      f.nodes.slice(0, n).map((p) => p.slot),
    );
  expect(bowPoint(0.5)).toEqual([0.67, 0.33]);
  expect(f.edges.filter((e) => e.control)).toHaveLength(4);
  expect(f.edges.find((e) => e.a === 12)?.end).toEqual([1, 2, 0.5]);
});
it('puts the latest completion at the knot, shares both fish equally and prioritizes recent rims', () => {
  const input = tasks(69).map((t, i) => ({ ...t, recent: i >= 30 })),
    f = pisces(input, [0, 0, 100]);
  expect(f.nodes[0]!.id).toBe(input[68]!.id);
  for (const fish of ['A', 'B']) {
    expect(f.nodes.filter((n) => n.slot.startsWith(`${fish}-`))).toHaveLength(34);
    expect(f.nodes.filter((n) => n.slot.startsWith(`${fish}-rim`))).toHaveLength(18);
  }
  expect(f.nodes.filter((n) => n.bright).every((n) => input.find((t) => t.id === n.id)!.recent)).toBe(true);
  expect(f.edges.filter((e) => e.control)).toHaveLength(2);
  expect(pisces(input, [0, 0, 100])).toEqual(f);
});
it('reduces fish interiors before their rims and makes all overflow stars dim', () => {
  for (const n of [20, 37, 45, 69, 110]) {
    const f = pisces(tasks(n), [0, 0, 100]);
    expect(f.nodes.filter((p) => p.bright)).toHaveLength(Math.min(n, 37));
    expect(f.nodes.filter((p) => !p.bright)).toHaveLength(Math.max(0, n - 37));
  }
});
it('leaves the other three lanes on their existing layout', () => {
  for (const lane of ['release', 'risk', 'planned'] as const)
    expect(figureFor(lane, tasks(10), [0, 0, 100])).toBeNull();
});
it('resamples a closed polygon and triangulates without supertriangle vertices', () => {
  const square: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    points: Point[] = [...square, [4, 5]];
  expect(resample(square, 4)).toEqual(square);
  expect(resample(square, 0)).toEqual([]);
  const triangles = delaunay(points);
  expect(triangles).toHaveLength(4);
  expect(new Set(triangles.flat()).size).toBe(5);
  expect(inPoly([5, 5], square)).toBe(true);
  expect(inPoly([11, 5], square)).toBe(false);
  for (const ps of [
    [],
    [[0, 0]],
    [
      [0, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  ] as Point[][])
    expect(delaunay(ps)).toEqual([]);
});

it('keeps eight external waits on legs and satellites, away from the eleven user skeleton stars', () => {
  const input = tasks(19).map((task, i) => ({ ...task, waitingOn: i < 8 ? ('dependency' as const) : undefined }));
  const f = scorpius(input, [0, 0, 100]);
  connected(f, 19);
  expect(f.nodes.map((n) => n.slot)).not.toContain('S');
  expect(f.nodes.filter((n) => n.bright)).toHaveLength(11);
  expect(f.nodes.filter((n) => n.slot.startsWith('extra-'))).toHaveLength(4);
  for (const t of input.slice(0, 8)) {
    const node = f.nodes.find((n) => n.id === t.id)!;
    expect(node.slot).toMatch(/^(L[1-4]|extra-)/);
    expect(node.bright).toBe(false);
  }
  expect(f.spur).toBeDefined();
  expect(f.nodes.filter((n) => /^L[1-4]$/.test(n.slot))).toHaveLength(4);
  expect(f.nodes.filter((n) => !n.bright)).toHaveLength(8);
  expect(f.nodes.find((n) => n.main)?.id).toBe(input[8]!.id);
  for (const e of f.edges.filter((e) => e.bright)) {
    expect(f.nodes[e.a]!.bright && f.nodes[e.b]!.bright).toBe(true);
  }
});
