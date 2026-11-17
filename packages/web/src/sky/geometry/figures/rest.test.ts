import { expect, it } from 'vitest';
import { figureFor } from './index';
import { LIBRA_OMIT, LIBRA_SLOTS, libra } from './libra';
import { TAURUS_OMIT, TAURUS_SLOTS, taurus } from './taurus';
import { ARIES_OMIT, ARIES_SLOTS, ARIES_SIMPLE_OMIT, ARIES_SIMPLE_SLOTS, aries } from './aries';
import { localPoint } from '../../draw/figures';
import type { FigureTask } from './types';

const tasks = (n: number): FigureTask[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `task-${i}`,
    updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
  }));

for (const [lane, slots, omit] of [
  ['risk', LIBRA_SLOTS, LIBRA_OMIT],
  ['release', TAURUS_SLOTS, TAURUS_OMIT],
  ['planned', ARIES_SLOTS, ARIES_OMIT],
] as const) {
  it(`${lane} preserves the omission order at every partial count and the template's proportions`, () => {
    for (let n = 1; n <= slots.length; n++) {
      const f = figureFor(lane, tasks(n), [10, 20, 100]);
      const simple = lane === 'planned' && n < 8;
      const currentSlots = simple ? ARIES_SIMPLE_SLOTS : slots;
      const currentOmit = simple ? ARIES_SIMPLE_OMIT : omit;
      const missing = new Set(currentOmit.slice(0, Math.max(0, currentSlots.length - n)));
      const active = currentSlots.filter(([name]) => !missing.has(name));
      expect(f.nodes.slice(0, active.length).map((node) => node.slot)).toEqual(active.map(([name]) => name));
      if (n === 1) {
        expect(f.nodes[0]!.point).toEqual([10, 20]);
        expect(f.edges).toEqual([]);
      } else
        f.nodes.slice(0, active.length).forEach((node, i) => {
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
it('uses creation time for the Aries forehead and falls back to updatedAt', () => {
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
  expect(taurus(input, [0, 0, 100]).nodes[0]!.id).toBe('a');
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
it('preserves exactly the Taurus horns, brow and face paths at nine stars', () => {
  const f = taurus(tasks(9), [0, 0, 100]);
  expect(f.edges.map((edge) => [f.nodes[edge.a]!.slot, f.nodes[edge.b]!.slot])).toEqual([
    ['tipL', 'hornL'],
    ['hornL', 'browL'],
    ['browL', 'browR'],
    ['browR', 'hornR'],
    ['hornR', 'tipR'],
    ['browL', 'cheekL'],
    ['cheekL', 'muzzle'],
    ['muzzle', 'cheekR'],
    ['cheekR', 'browR'],
  ]);
  expect(f.edges.every((edge) => edge.bright)).toBe(true);
});
it.each([...Array.from({ length: 15 }, (_, i) => i), 25])('keeps Taurus connected at %i stars', (n) => {
  const f = taurus(tasks(n), [10, 20, 100]);
  expect(f.nodes).toHaveLength(n);
  expect(f.nodes.every((node) => node.point.every(Number.isFinite))).toBe(true);
  const seen = new Set(n ? [0] : []);
  for (let i = 0; i < n; i++)
    for (const edge of f.edges) {
      if (seen.has(edge.a)) seen.add(edge.b);
      if (seen.has(edge.b)) seen.add(edge.a);
    }
  expect(seen.size).toBe(n);
  if (n < 2) expect(f.edges).toEqual([]);
  if (n === 1) expect(f.nodes[0]).toMatchObject({ slot: 'muzzle', point: [10, 20], main: true });
});
it('omits Taurus cheeks before horn joints, horn tips and brows, preserving the muzzle', () => {
  const omit = ['cheekR', 'cheekL', 'hornR', 'hornL', 'tipR', 'tipL', 'browR', 'browL'];
  let remaining = ['muzzle', 'browL', 'browR', 'hornL', 'hornR', 'tipL', 'tipR', 'cheekL', 'cheekR'];
  for (const slot of omit) {
    remaining = remaining.filter((name) => name !== slot);
    expect(taurus(tasks(remaining.length), [0, 0, 100]).nodes.map((node) => node.slot)).toEqual(remaining);
  }
});
it('fills dim Taurus ears and eyes in order before random overflow stars', () => {
  const f = taurus(tasks(14), [0, 0, 100]);
  const extras = [
    [0.2, 0.42],
    [0.8, 0.42],
    [0.42, 0.5],
    [0.58, 0.5],
  ];
  extras.forEach(([x, y], i) => {
    const node = f.nodes[9 + i]!;
    expect(node.bright).toBe(false);
    expect(node.point[0]).toBeCloseTo((x! - 0.5) * 170);
    expect(node.point[1]).toBeCloseTo((y! - 0.5) * 170);
  });
  expect(f.nodes[13]!.bright).toBe(false);
});
it('puts the earliest updatedAt task at the Taurus muzzle regardless of creation time or input order', () => {
  const input = tasks(13).map((task, i) => ({ ...task, createdAt: i ? '2001-01-01' : '1990-01-01' }));
  input[7]!.updatedAt = '2000-01-01';
  const f = taurus(input.reverse(), [0, 0, 100]);
  expect(f.nodes.find((node) => node.main)).toMatchObject({ id: 'task-7', slot: 'muzzle', bright: true });
});

it.each([0, 1, 4, 7, 8, 9, 10, 12, 14, 16, 30])('keeps all %i Aries tasks connected as the line becomes a ram', (n) => {
  const f = aries(tasks(n), [0, 0, 100]);
  expect(new Set(f.nodes.map((node) => node.id)).size).toBe(n);
  expect(f.arcs ?? []).toEqual([]);
  expect(f.edges.every((edge) => !edge.start && !edge.end)).toBe(true);
  const curved = f.edges.filter((edge) => edge.control);
  expect(curved).toHaveLength(n < 8 ? 0 : Math.min(n, 10) - 4);
  for (const edge of curved) {
    expect(edge.bright).toBe(true);
    expect(f.nodes[edge.a]!.bright && f.nodes[edge.b]!.bright).toBe(true);
    expect(f.nodes[edge.b]!.slot).toMatch(/^(crown|outer|curl)[LR]$/);
  }
  const reached = new Set(n ? [0] : []);
  for (let pass = 0; pass < n; pass++)
    for (const edge of f.edges) {
      if (reached.has(edge.a)) reached.add(edge.b);
      if (reached.has(edge.b)) reached.add(edge.a);
    }
  expect(reached.size).toBe(n);
  for (const edge of f.edges)
    expect([...(edge.control ?? []), ...f.nodes[edge.a]!.point, ...f.nodes[edge.b]!.point].every(Number.isFinite)).toBe(
      true,
    );
});
