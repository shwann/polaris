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
  const result = separatePoints(input, 16);
  spaced(result, 16);
  expect(result).toEqual(separatePoints(input, 16));
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
