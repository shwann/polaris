import { expect, it } from 'vitest';
import { figureFor } from './index';
import { LIBRA_OMIT, LIBRA_SLOTS, libra } from './libra';
import { LEO_OMIT, LEO_SLOTS, leo } from './leo';
import { ARIES_OMIT, ARIES_SLOTS, aries } from './aries';
import { localPoint } from '../../draw/figures';
import type { FigureTask } from './types';

const tasks = (n: number): FigureTask[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `task-${i}`,
    updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
  }));

for (const [lane, slots, omit] of [
  ['risk', LIBRA_SLOTS, LIBRA_OMIT],
  ['release', LEO_SLOTS, LEO_OMIT],
  ['planned', ARIES_SLOTS, ARIES_OMIT],
] as const) {
  it(`${lane} preserves the omission order at every partial count and the template's proportions`, () => {
    for (let n = 1; n <= slots.length; n++) {
      const f = figureFor(lane, tasks(n), [10, 20, 100]);
      const missing = new Set(omit.slice(0, slots.length - n));
      const active = slots.filter(([name]) => !missing.has(name));
      expect(f.nodes.map((node) => node.slot)).toEqual(active.map(([name]) => name));
      if (n === 1) {
        expect(f.nodes[0]!.point).toEqual([10, 20]);
        expect(f.edges).toEqual([]);
      } else
        f.nodes.forEach((node, i) => {
          expect(node.point[0]).toBeCloseTo(10 + (active[i]![1] - 0.5) * 170);
          expect(node.point[1]).toBeCloseTo(20 + (active[i]![2] - 0.5) * 170);
        });
    }
  });
  it(`${lane} attaches every overflow star with a dim edge to the nearest placed star`, () => {
    const f = figureFor(lane, tasks(25), [0, 0, 100]);
    f.nodes.slice(slots.length).forEach((node, j) => {
      const i = slots.length + j,
        edges = f.edges.filter((edge) => edge.a === i || edge.b === i),
        edge = edges.find((edge) => (edge.a === i ? edge.b : edge.a) < i)!;
      expect(node.bright).toBe(false);
      expect(edges.length).toBeGreaterThan(0);
      expect(edges.every((edge) => !edge.bright)).toBe(true);
      const distance = (k: number) =>
        Math.hypot(node.point[0] - f.nodes[k]!.point[0], node.point[1] - f.nodes[k]!.point[1]);
      expect(distance(edge.a === i ? edge.b : edge.a)).toBeCloseTo(
        Math.min(...f.nodes.slice(0, i).map((_, k) => distance(k))),
      );
    });
  });
  it.each([1, slots.length - 1, slots.length, slots.length + 5])(
    `${lane} selects the oldest task for count %i`,
    (n) => {
      const input = tasks(n);
      input.at(-1)!.updatedAt = '2000-01-01';
      const f = figureFor(lane, input, [0, 0, 100]);
      expect(f.nodes.find((node) => node.main)?.id).toBe(input.at(-1)!.id);
      expect(f.nodes[0]!.size).toBeGreaterThan(1);
    },
  );
}

it('uses waitingSince for the Libra pivot and falls back to updatedAt', () => {
  const input = tasks(4);
  input[2]!.waitingSince = '2000-01-01';
  input[3]!.updatedAt = '2001-01-01';
  expect(libra(input, [0, 0, 100]).nodes[0]!.id).toBe('task-2');
  delete input[2]!.waitingSince;
  expect(libra(input, [0, 0, 100]).nodes[0]!.id).toBe('task-3');
});
it('uses creation time for Hamal and falls back to updatedAt', () => {
  const input = tasks(4);
  input[2]!.createdAt = '2000-01-01';
  input[3]!.updatedAt = '2001-01-01';
  expect(aries(input, [0, 0, 100]).nodes[0]!.id).toBe('task-2');
  delete input[2]!.createdAt;
  expect(aries(input, [0, 0, 100]).nodes[0]!.id).toBe('task-3');
});
it('places unknown dates after known dates and resolves ties by ID', () => {
  const input = [
    { id: 'z', updatedAt: '2020-01-01' },
    { id: 'a', updatedAt: '2020-01-01' },
    { id: '0' },
    { id: '1', updatedAt: 'invalid' },
  ];
  expect(leo(input, [0, 0, 100]).nodes[0]!.id).toBe('a');
});
it('draws two downward curved Libra rims of width .16 without creating stars or graph edges', () => {
  for (const n of [0, 1, 2, 3, 4, 8]) {
    const f = libra(tasks(n), [0, 0, 100]);
    expect(f.nodes).toHaveLength(n);
    expect(f.arcs ?? []).toHaveLength(n < 2 ? 0 : n === 2 ? 1 : 2);
    for (const arc of f.arcs ?? []) {
      const from = f.nodes[arc.from]!.point,
        pan = f.nodes[arc.at]!.point,
        start = localPoint(from, pan, arc.start),
        end = localPoint(from, pan, arc.end),
        control = localPoint(from, pan, arc.control);
      expect(end[0] - start[0]).toBeCloseTo(0.16 * 170);
      expect(start[1]).toBeGreaterThan(pan[1]);
      expect(control[1]).toBeGreaterThan(start[1]);
      expect(end[1]).toBeCloseTo(start[1]);
    }
  }
});
it('preserves the Leo sickle and body paths at nine stars', () => {
  const f = leo(tasks(9), [0, 0, 100]);
  expect(f.edges.map((edge) => [f.nodes[edge.a]!.slot, f.nodes[edge.b]!.slot])).toEqual([
    ['Regulus', 'eta'],
    ['eta', 'Algieba'],
    ['Algieba', 'zeta'],
    ['zeta', 'mu'],
    ['mu', 'eps'],
    ['Algieba', 'Zosma'],
    ['Zosma', 'Denebola'],
    ['Denebola', 'Chertan'],
    ['Chertan', 'Regulus'],
  ]);
});
