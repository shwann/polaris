import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { home, layoutHomes } from './clusters';
import { separatePoints, STAR_SPACING } from './spacing';
import type { Point } from '../types';

function spaced(points: Point[], minimum: number) {
  points.forEach((a, i) =>
    points
      .slice(i + 1)
      .forEach((b) => expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThanOrEqual(minimum - 1e-8)),
  );
}
it('separates exact overlaps and dense neighbors deterministically without changing the centroid', () => {
  const input: Point[] = Array.from({ length: 44 }, (_, i) => [i % 3, i % 5]);
  const result = separatePoints(input, STAR_SPACING);
  spaced(result, STAR_SPACING);
  expect(result).toEqual(separatePoints(input, STAR_SPACING));
  expect(input[0]).toEqual([0, 0]);
  for (const axis of [0, 1])
    expect(result.reduce((n, p) => n + p[axis]!, 0)).toBeCloseTo(
      input.reduce((n, p) => n + p[axis]!, 0),
      8,
    );
  expect(separatePoints([], 16)).toEqual([]);
  expect(
    separatePoints(
      [
        [0, 0],
        [100, 0],
      ],
      16,
    ),
  ).toEqual([
    [0, 0],
    [100, 0],
  ]);
});
it('keeps minimum screen spacing at every zoom and during the slow cluster rotation', () => {
  const { s, star, registry } = fixture();
  const stars = Array.from({ length: 20 }, (_, i) => star(String(i), 1, 1, 'done'));
  for (const scale of [0.5, 0.73, 1, 5]) {
    s.camT.s = scale;
    layoutHomes(s);
    for (const time of [0, 50000, 150000]) {
      spaced(
        stars.map((st) => home(s, st, time).map((v) => v * scale) as Point),
        STAR_SPACING,
      );
    }
    const first = stars.map((st) => [st.layoutX, st.layoutY]);
    layoutHomes(s);
    expect(stars.map((st) => [st.layoutX, st.layoutY])).toEqual(first);
  }
  registry.dispose();
});

it.each([8, 10, 12])('keeps a %s-star risk cluster spaced, centered and deterministic at default zoom', (count) => {
  const { s, star, registry } = fixture();
  const stars = Array.from({ length: count }, (_, i) => {
    const node = star(`task-${i}`, 0, 0, 'risk');
    node.ang = i * 2.39996;
    node.rad = 0.25 + (i % 4) * 0.1;
    return node;
  });
  layoutHomes(s);
  const first = stars.map((st) => home(s, st, 0));
  spaced(first, STAR_SPACING);
  layoutHomes(s);
  expect(stars.map((st) => home(s, st, 0))).toEqual(first);
  const center = s.centre('risk'),
    R = center[2];
  const original = stars.map((st): Point => [
    center[0] + Math.cos(st.ang) * st.rad * R * 1.25,
    center[1] + Math.sin(st.ang) * st.rad * R * 0.85,
  ]);
  for (const axis of [0, 1])
    expect(first.reduce((sum, p) => sum + p[axis]!, 0)).toBeCloseTo(
      original.reduce((sum, p) => sum + p[axis]!, 0),
      8,
    );
  expect(STAR_SPACING).toBeGreaterThanOrEqual(2 * 3.6 * 5.5);
  registry.dispose();
});
