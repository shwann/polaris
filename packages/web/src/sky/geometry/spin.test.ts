import '../../../tests/support';
import { expect, it } from 'vitest';
import { advanceSpin, home, SPIN_FULL, SPIN_STOP, spinRate } from './clusters';
import type { SkyState, Star } from '../types';
import { fixture } from '../testFixture';
import { figureFor } from './figures';

it('spins fully in the overview and stops once zoomed in for reading', () => {
  expect(spinRate(0.5)).toBe(1);
  expect(spinRate(SPIN_FULL)).toBe(1);
  expect(spinRate((SPIN_FULL + SPIN_STOP) / 2)).toBeCloseTo(0.5);
  expect(spinRate(SPIN_STOP)).toBe(0);
  expect(spinRate(5)).toBe(0);
});

it('keeps star homes still while zoomed in and resumes without a jump', () => {
  const s = { centre: () => [0, 0, 100], sky: true, w: 1440, cam: { s: 3 }, spinT: 5000 } as unknown as SkyState,
    star = { group: 'doing', layoutX: 80, layoutY: 0, ang: 0, rad: 1 } as unknown as Star;
  const before = home(s, star, 1);
  for (let i = 0; i < 120; i++) advanceSpin(s, 16);
  expect(home(s, star, 2)).toEqual(before);
  s.cam.s = 1;
  advanceSpin(s, 16);
  const after = home(s, star, 3);
  expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeGreaterThan(0);
  expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeLessThan(1);
});

it.each([
  ['risk', 3, 18000],
  ['release', 5, 24000],
] as const)('rocks %s by up to %s degrees and holds the angle when paused', (lane, maxAngle, period) => {
  const { s, star, registry } = fixture();
  s.centre = () => [0, 0, 100];
  const figure = figureFor(
    lane,
    ['a', 'b', 'c'].map((id) => ({ id })),
    [0, 0, 100],
  );
  s.figures.set(lane, figure);
  const role = figure.nodes[1]!,
    node = Object.assign(star(role.id, 0, 0, lane), {
      figureRole: role,
      layoutX: role.point[0],
      layoutY: role.point[1],
    }),
    pivot = lane === 'risk' ? figure.nodes[0]!.point : [0, 0];
  const angle = ([x, y]: [number, number]) => Math.atan2(y - pivot[1]!, x - pivot[0]!);
  const resting = angle(home(s, node, 0));
  advanceSpin(s, period / 4);
  const peak = home(s, node, 1);
  expect(angle(peak) - resting).toBeCloseTo((maxAngle * Math.PI) / 180);
  s.paused = new Set([lane]);
  advanceSpin(s, period / 4);
  expect(home(s, node, 1)).toEqual(peak);
  s.paused.clear();
  s.cam.s = SPIN_STOP;
  advanceSpin(s, period / 4);
  expect(home(s, node, 1)).toEqual(peak);
  s.cam.s = 1;
  advanceSpin(s, period / 2);
  expect(angle(home(s, node, 1)) - resting).toBeCloseTo((-maxAngle * Math.PI) / 180);
  registry.dispose();
});
