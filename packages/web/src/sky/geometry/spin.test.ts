import '../../../tests/support';
import { expect, it } from 'vitest';
import { advanceSpin, home, SPIN_FULL, SPIN_STOP, spinRate } from './clusters';
import type { SkyState, Star } from '../types';

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
