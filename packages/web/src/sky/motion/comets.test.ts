import { expect, it } from 'vitest';
import { advanceComets, COMET_GAP, COMET_JITTER } from './comets';
import type { SkyState } from '../types';

it.each([0, 0.5, 0.999])('keeps one meteor and at least six seconds of silence with random %s', (random) => {
  const s: Pick<SkyState, 'comets' | 'nextComet' | 'w' | 'h' | 'reduce'> = {
    comets: [],
    nextComet: 0,
    w: 1440,
    h: 900,
    reduce: { matches: false } as MediaQueryList,
  };
  let previousExit = -Infinity,
    previousCount = 0,
    starts = 0;
  for (let t = 0; t < 120000; t += 16) {
    advanceComets(s, t, 16, () => random);
    expect(s.comets.length).toBeLessThanOrEqual(1);
    if (previousCount && !s.comets.length) {
      previousExit = t;
      expect(s.nextComet - t).toBeGreaterThanOrEqual(COMET_GAP);
      expect(s.nextComet - t).toBeLessThanOrEqual(COMET_GAP + COMET_JITTER);
    }
    if (!previousCount && s.comets.length) {
      starts++;
      expect(t - previousExit).toBeGreaterThanOrEqual(COMET_GAP);
    }
    previousCount = s.comets.length;
  }
  expect(starts).toBeGreaterThan(3);
  s.reduce = { matches: true } as MediaQueryList;
  advanceComets(s, 120000, 16);
  expect(s.comets).toEqual([]);
  advanceComets(s, 130000, 16);
  expect(s.comets).toEqual([]);
});
