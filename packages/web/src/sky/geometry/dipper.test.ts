import { describe, it, expect } from 'vitest';
import { shape, fit, orbitRadius } from './dipper';
import type { Point, Box } from '../types';
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
describe('catalogue geometry', () => {
  it.each([0, 25, 45, 90, 180, 273])('preserves every pairwise ratio at %s degrees and uniform scale', (deg) => {
    const original = shape(0).pts,
      rotated = shape(deg),
      p = fit([0, 0, 800, 500], 1e9, rotated);
    const ratio = dist(p[0]!, p[1]!) / dist(original[0]!, original[1]!);
    for (let i = 0; i < 7; i++)
      for (let j = i + 1; j < 7; j++)
        expect(dist(p[i]!, p[j]!) / dist(original[i]!, original[j]!)).toBeCloseTo(ratio, 8);
  });
  it.each([
    [0, 0, 375, 667],
    [12, 24, 1440, 900],
    [5, 5, 6, 6],
  ] as Box[])('fits without leaving the rectangle (%s,%s,%s,%s)', (...box: Box) => {
    for (const [x, y] of fit(box)) {
      expect(x).toBeGreaterThanOrEqual(box[0]);
      expect(x).toBeLessThanOrEqual(box[2]);
      expect(y).toBeGreaterThanOrEqual(box[1]);
      expect(y).toBeLessThanOrEqual(box[3]);
    }
  });
  it('clamps orbit radii including future ripple start times', () => {
    expect(orbitRadius(-30)).toBe(0);
    expect(orbitRadius(60)).toBe(60);
  });
});
