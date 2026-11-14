import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { hash } from '../palette';
import { drawStarLabels, overlaps } from '../draw/starLabels';
import { starHalos } from '../draw/labelObstacles';
import { WIDE } from '../constants';
import { fit } from './dipper';
import { centre, DONE_SHRINK, home, layoutHomes, NEAR_HUB_GAP, NEAR_HUB_MAX } from './clusters';
import { clusterSpacing } from './spacing';
import type { Lane } from '../../domain/types';
import type { Point } from '../types';

/** The 1440×900 overview, with the bowl the real chart computes for that size. */
function overview(n: number, group: Lane = 'waiting') {
  const f = fixture();
  Object.assign(f.s, { w: 1440, h: 900, unit: 1260, ZONE: WIDE });
  const p = fit([0.06 * 1440, 0.1 * 900, 0.86 * 1440, 0.86 * 900]).slice(0, 4),
    xs = p.map((v) => v[0]),
    ys = p.map((v) => v[1]);
  f.s.bowl = [
    xs.reduce((a, b) => a + b) / 4,
    ys.reduce((a, b) => a + b) / 4,
    Math.min((Math.max(...xs) - Math.min(...xs)) / 2 / 1.25, (Math.max(...ys) - Math.min(...ys)) / 2 / 0.85) * 0.62,
  ];
  f.s.home = (star, t) => home(f.s, star, t);
  const stars = Array.from({ length: n }, (_, i) => {
    const star = f.star(`W${i}`, 0, 0, group);
    star.ang = hash(star.id, 7) * 6.2832;
    star.rad = 0.25 + 0.75 * Math.sqrt(hash(star.id, 11));
    return star;
  });
  f.s.counts.set(group, n);
  layoutHomes(f.s);
  for (const star of stars) [star.x, star.y] = home(f.s, star, 0);
  return { ...f, stars };
}
const gap = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

it.each([19, 30])('spaces a %s-star waiting cluster so a code label fits between any two stars', (n) => {
  const { s, stars, registry } = overview(n);
  const min = clusterSpacing(s.unit);
  expect(min).toBeGreaterThanOrEqual(45);
  const points = stars.map((st): Point => [st.x, st.y]);
  points.forEach((a, i) => points.slice(i + 1).forEach((b) => expect(gap(a, b)).toBeGreaterThanOrEqual(min - 1e-6)));
  // Layout halos never reach past half the gap to the nearest neighbour.
  for (const [i, halo] of starHalos(s).entries()) {
    const nearest = Math.min(...points.filter((_, j) => j !== i).map((p) => gap(p, halo.point)));
    expect(halo.radius).toBeLessThanOrEqual(nearest / 2 + 1e-9);
  }
  registry.dispose();
});

it('grows the cluster with its count instead of squeezing more stars into the same patch', () => {
  const a = overview(8),
    b = overview(30);
  expect(centre(b.s, 'waiting')[2]).toBeGreaterThan(centre(a.s, 'waiting')[2]);
  a.registry.dispose();
  b.registry.dispose();
});

it.each([19, 30])('places %s waiting code labels in the 1440×900 overview without any overlapping text', (n) => {
  const { s, stars, registry } = overview(n);
  s.ctx.measureText = (text: string) => ({ width: text.length * 7.4 }) as TextMetrics;
  const placed = drawStarLabels(
    s,
    stars.map((st) => ({
      id: st.id,
      x: st.x,
      y: st.y - 6,
      gap: 9,
      lines: [`AIXG${st.id}`],
      a: 1,
      c: [255, 79, 109],
      pri: 3,
    })),
  );
  placed.forEach((a, i) => placed.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
  expect(placed.length).toBeGreaterThanOrEqual(Math.ceil(n * 0.6));
  registry.dispose();
});

it.each([1, 2])('keeps a %s-star group right beside its own Dipper star', (n) => {
  const { s, stars, registry } = overview(n, 'planned');
  const beta = fit([0.06 * 1440, 0.1 * 900, 0.86 * 1440, 0.86 * 900])[1]!;
  const limit = s.unit * NEAR_HUB_GAP + clusterSpacing(s.unit) * 1.2;
  for (const st of stars) expect(gap([st.x, st.y], beta)).toBeLessThanOrEqual(limit);
  expect(limit).toBeLessThan(s.unit * 0.15);
  registry.dispose();
});

it('lets a group with more than two stars keep its own zone', () => {
  const { s, registry } = overview(NEAR_HUB_MAX + 1, 'planned');
  const beta = fit([0.06 * 1440, 0.1 * 900, 0.86 * 1440, 0.86 * 900])[1]!;
  const [x, y] = centre(s, 'planned');
  expect(gap([x, y], beta)).toBeGreaterThan(s.unit * NEAR_HUB_GAP * 2);
  registry.dispose();
});

it('shrinks the shipped cloud to about half its former area', () => {
  const { s, registry } = overview(68, 'done');
  const former = s.unit * (0.05 + 0.01 * Math.sqrt(68));
  expect((centre(s, 'done')[2] / former) ** 2).toBeCloseTo(DONE_SHRINK ** 2, 5);
  expect(DONE_SHRINK ** 2).toBeGreaterThan(0.4);
  expect(DONE_SHRINK ** 2).toBeLessThan(0.6);
  registry.dispose();
});

it('caps every layout halo at half the gap to its nearest neighbour even when stars crowd', () => {
  const { s, star, registry } = fixture();
  star('a', 300, 300, 'waiting');
  star('b', 310, 300, 'waiting');
  for (const halo of starHalos(s)) expect(halo.radius).toBeLessThanOrEqual(5);
  registry.dispose();
});
