import { describe, expect, it } from 'vitest';
import { KEEP, constrain, panBounds, rubber } from './bounds';
import { coast, record, velocity } from './inertia';
import { spring } from './spring';
import type { Point } from '../types';

describe('inertia', () => {
  it('estimates px/s from irregular samples and weights recent time more heavily', () => {
    const samples = [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 10, t: 20 },
      { x: 80, y: 40, t: 80 },
    ];
    expect(velocity(samples, 80)).toEqual([1000, 500]);
    expect(
      velocity(
        [
          { x: 0, y: 0, t: 0 },
          { x: 0, y: 0, t: 40 },
          { x: 40, y: 0, t: 80 },
        ],
        80,
      )[0],
    ).toBeGreaterThan(500);
    expect(velocity(record(samples, { x: 80, y: 40, t: 200 }), 200)).toEqual([0, 0]);
    expect(velocity(record([{ x: 0, y: 0, t: 0 }], { x: 100, y: 0, t: 100 }), 100)[0]).toBeCloseTo(1000);
  });
  it('integrates the same travel at 30, 60 and 144 Hz and stops at low speed', () => {
    const distances = [30, 60, 144].map((hz) => {
      let v: Point = [1000, -500],
        x = 0;
      for (let i = 0; i < hz * 4; i++) {
        const next = coast(v, 1000 / hz);
        x += next.delta[0];
        v = next.velocity;
      }
      expect(v).toEqual([0, 0]);
      return x;
    });
    expect(Math.max(...distances) / Math.min(...distances)).toBeLessThan(1.05);
    expect(coast([8, 0], 16)).toEqual({ delta: [0, 0], velocity: [0, 0] });
  });
});

describe('spring', () => {
  it('keeps visible travel at 150ms, overshoots 10–15%, and settles to 2% in 600–800ms', () => {
    expect(spring(100, 0, 0, 150).x).toBeGreaterThan(40);
    const samples = Array.from({ length: 201 }, (_, i) => spring(100, 0, 0, i * 10).x);
    const minimum = Math.min(...samples);
    expect(minimum).toBeGreaterThan(-15);
    expect(minimum).toBeLessThan(-10);
    const lastOutside = samples.findLastIndex((x) => Math.abs(x) > 2) * 10;
    expect(lastOutside).toBeGreaterThanOrEqual(600);
    expect(lastOutside).toBeLessThanOrEqual(800);
    expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.05);
  });
  it('has identical solutions across frame rates, including long frames', () => {
    const expected = spring(100, 23, 0, 1000);
    for (const hz of [30, 60, 144]) {
      let x = 100,
        v = 23;
      for (let i = 0; i < hz; i++) {
        const next = spring(x, v, 0, 1000 / hz);
        x = next.x;
        v = next.v;
      }
      expect(x).toBeCloseTo(expected.x, 8);
      expect(v).toBeCloseTo(expected.v, 8);
    }
  });
});

describe('bounds', () => {
  it('leaves legal positions alone and progressively resists outside movement', () => {
    expect(rubber(50, 0, 100)).toBe(50);
    const first = rubber(150, 0, 100) - 100,
      second = rubber(200, 0, 100) - rubber(150, 0, 100);
    expect(first).toBeLessThan(50);
    expect(second).toBeLessThan(first);
    expect(rubber(-50, 0, 100)).toBeCloseTo(-first);
  });
  it('includes anchors, expands on zoom and retains the reset position at unit scale', () => {
    const points: Point[] = [
      [80, 80],
      [920, 720],
    ];
    const box = panBounds(points, 1000, 800, 1),
      zoom = panBounds(points, 1000, 800, 2);
    expect(constrain([0, 0], box)).toEqual([0, 0]);
    expect(zoom[0]).toBeLessThan(box[0]);
    const high = panBounds(points, 1000, 800, 5);
    // At the limits the far edge of the content still sits KEEP of the viewport in from the opposite side.
    expect(80 * 5 + high[2]).toBeCloseTo(1000 * (1 - KEEP));
    expect(920 * 5 + high[0]).toBeCloseTo(1000 * KEEP);
    // Content that fills the screen can still be dragged well past either side at unit scale.
    expect(box[0]).toBeLessThan(-400);
    expect(box[2]).toBeGreaterThan(400);
    let x = box[2] + 100,
      v = 0;
    for (let i = 0; i < 100; i++) {
      const next = spring(x, v, box[2], 16, 18, 1);
      x = next.x;
      v = next.v;
    }
    expect(x).toBeCloseTo(box[2], 5);
  });
});
