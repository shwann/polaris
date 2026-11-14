import { expect, it } from 'vitest';
import type { Release } from '@polaris/core';
import { aquariusLayout, highlightedDeliveries } from './aquariusLayout';
import { inPoly } from './triangulate';

const releases = (n: number): Release[] =>
  Array.from({ length: n }, (_, i) => ({
    version: `.${i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    title: '发布简介',
    tag: 'fix',
    items: Array.from({ length: 10 }, (_, j) => ({
      id: `t${i}-${j}`,
      code: `FIX-${i}-${j}`,
      title: '修复',
      kind: 'fix',
    })),
  }));

it.each([0, 1, 2, 12, 15])(
  'lays out %s releases deterministically, with alternating waves and a surface latest',
  (n) => {
    const input = releases(n).reverse(),
      layout = aquariusLayout(input, 2000, 1250);
    const { transform: _first, ...first } = layout;
    const { transform: _second, ...second } = aquariusLayout(input, 2000, 1250);
    expect(first).toEqual(second);
    expect(layout.stars).toHaveLength(Math.min(12, n));
    expect(layout.stars.map((s) => s.release.version)).toEqual(
      releases(n)
        .slice(-12)
        .map((r) => r.version),
    );
    for (const [i, star] of layout.stars.slice(0, -1).entries()) {
      expect(star.wave).toBe(i % 2);
      expect(star.point).toEqual(layout.waves[i % 2]![star.sample]);
      expect(star.radius).toBeLessThan(layout.stars.at(-1)!.radius);
      expect(star.alpha).toBeLessThan(layout.stars.at(-1)!.alpha);
      if (i) expect(star.point[1]).toBeGreaterThan(layout.stars[i - 1]!.point[1]);
    }
    if (n) {
      expect(layout.stars.at(-1)!.point).toEqual(layout.surface);
      expect(layout.stars.at(-1)!.wave).toBeNull();
    }
    expect(layout.inner).toHaveLength(n * 10);
    expect(layout.omitted).toBe(0);
    expect(layout.inner.every((p) => inPoly(p.point, layout.rim))).toBe(true);
    expect(layout.inner.every((p, i) => !i || p.depth <= layout.inner[i - 1]!.depth)).toBe(true);
    for (const t of layout.triangles)
      expect(
        inPoly(
          [t.reduce((s, i) => s + layout.points[i]![0], 0) / 3, t.reduce((s, i) => s + layout.points[i]![1], 0) / 3],
          layout.rim,
        ),
      ).toBe(true);
  },
);
it('highlights exactly the hovered items, including releases outside the twelve visible stars', () => {
  const input = releases(15),
    layout = aquariusLayout(input, 2000, 1250);
  for (const release of input)
    expect(
      highlightedDeliveries(layout, release)
        .map((p) => p.id)
        .sort(),
    ).toEqual(release.items!.map((p) => p.id).sort());
  expect(highlightedDeliveries(layout)).toEqual([]);
});
it('includes shipped tasks without a matching release and counts overflow after reducing spacing', () => {
  const deliveries = Array.from({ length: 2000 }, (_, i) => ({ id: `task-${i}`, version: '.unknown' }));
  const layout = aquariusLayout([], 400, 250, deliveries);
  expect(layout.inner.length).toBeGreaterThan(0);
  expect(layout.inner.length + layout.omitted).toBe(2000);
  expect(layout.omitted).toBeGreaterThan(0);
  expect(layout.gap).toBeLessThan(15);
  expect(layout.inner.every((p) => inPoly(p.point, layout.rim))).toBe(true);
});
