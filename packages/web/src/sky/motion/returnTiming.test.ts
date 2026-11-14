import { expect, it } from 'vitest';
import { figureReturnTimings, remainingOffset, returnOffset, returnTimings } from './returnTiming';
import type { SkyState } from '../types';

it('returns the body first and gives the last three displaced stars separate turns', () => {
  const particles = [150, 2, 50, 30, 70, 8].map((ox) => ({ ox, oy: 0, vx: 0, vy: 0 }));
  const timings = returnTimings(particles, 1);
  const final = [...timings.values()].filter((timing) => timing.gather > 0);
  expect(final).toHaveLength(3);
  expect(timings.get(particles[0]!)!.gather).toBe(0);
  const start = final[0]!.delay;
  expect(final.map((timing) => remainingOffset(start, timing))).toEqual([0.45, 0.45, 0.45]);
  final.forEach((timing, i) => {
    if (i) expect(timing.delay).toBe(final[i - 1]!.delay + final[i - 1]!.duration);
    expect(remainingOffset(timing.delay + timing.duration / 2, timing)).toBeCloseTo(0.225);
    expect(remainingOffset(timing.delay + timing.duration, timing)).toBe(0);
  });
});

it('alternates the landing style and corrects provisional positions one by one', () => {
  const s = { cam: { s: 1 } } as SkyState;
  const particles = [90, 65, 75, 50].map((ox, i) => ({ ox, oy: 0, vx: 0, vy: 0, baseX: i * 40, baseY: 0 }));
  const plan = (key = 'done') => [...figureReturnTimings(s, key, particles).values()].filter((timing) => timing.gather);
  expect(plan().every((timing) => !timing.provisional)).toBe(true);
  const corrections = plan();
  expect(corrections).toHaveLength(3);
  for (const timing of corrections) {
    expect(Math.abs(timing.provisional![0])).toBeCloseTo(16.8);
    expect(returnOffset([100, 0], 0, timing)).toEqual([100, 0]);
    expect(returnOffset([100, 0], timing.gather, timing)).toEqual(timing.provisional);
    expect(returnOffset([100, 0], timing.delay, timing)).toEqual(timing.provisional);
    expect(returnOffset([100, 0], timing.delay + timing.duration, timing).map(Math.abs)).toEqual([0, 0]);
  }
  expect(plan('aquarius').every((timing) => !timing.provisional)).toBe(true);
  expect(plan().every((timing) => !timing.provisional)).toBe(true);
});
