import { expect, it } from 'vitest';
import { placeCard, type CardSide } from './cardPlacement';
import type { Box, Point } from '../types';

it.each<[Box, Point, CardSide]>([
  [[100, 250, 350, 450], [220, 350], 'right'],
  [[650, 250, 900, 450], [780, 350], 'left'],
  [[300, 50, 700, 200], [500, 100], 'bottom'],
  [[300, 550, 700, 750], [500, 650], 'top'],
])('places the card on the largest free side of %j', (cluster, star, side) => {
  const p = placeCard(star, cluster, [330, 180], [1000, 800]);
  expect(p.side).toBe(side);
  expect(p.pan).toEqual([0, 0]);
  if (side === 'right') expect(p.left).toBeGreaterThan(cluster[2]);
  if (side === 'left') expect(p.left + 330).toBeLessThan(cluster[0]);
  if (side === 'bottom') expect(p.top).toBeGreaterThan(cluster[3]);
  if (side === 'top') expect(p.top + 180).toBeLessThan(cluster[1]);
});
it('pans a crowded or offscreen selection into view without covering the star, retaining its chosen side', () => {
  for (const star of [
    [-200, 100],
    [1100, 300],
    [500, 850],
    [500, 400],
  ] as Point[]) {
    const p = placeCard(star, [-300, -100, 1400, 1000], [330, 220], [1000, 800]);
    const [x, y] = [star[0] + p.pan[0], star[1] + p.pan[1]];
    expect(p.left).toBeGreaterThanOrEqual(16);
    expect(p.top).toBeGreaterThanOrEqual(16);
    expect(p.left + 330).toBeLessThanOrEqual(984);
    expect(p.top + 220).toBeLessThanOrEqual(784);
    expect(x).toBeGreaterThanOrEqual(26);
    expect(x).toBeLessThanOrEqual(974);
    expect(y).toBeGreaterThanOrEqual(26);
    expect(y).toBeLessThanOrEqual(774);
    expect(x < p.left || x > p.left + 330 || y < p.top || y > p.top + 220).toBe(true);
    expect(placeCard([x, y], [-300, -100, 1400, 1000], [330, 220], [1000, 800], p.side).side).toBe(p.side);
  }
});

it.each([
  [
    [727, 392],
    [727, 392, 727, 392],
    [320, 300],
  ],
  [
    [950, 517],
    [810, 460, 990, 600],
    [330, 220],
  ],
] as [Point, Box, Point][])(
  'avoids neighboring Dipper and Polaris stars and labels for selection %j',
  (star, cluster, size) => {
    const obstacles: Box[] = [
      [548, 395, 670, 425],
      [560, 360, 600, 395],
      [710, 365, 865, 385],
      [120, 100, 220, 170],
    ];
    const p = placeCard(star, cluster, size, [1440, 826], undefined, obstacles);
    const card: Box = [p.left, p.top, p.left + size[0], p.top + size[1]];
    for (const b of obstacles) {
      const shifted: Box = [b[0] + p.pan[0], b[1] + p.pan[1], b[2] + p.pan[0], b[3] + p.pan[1]];
      expect(card[0] < shifted[2] && card[2] > shifted[0] && card[1] < shifted[3] && card[3] > shifted[1]).toBe(false);
    }
  },
);
it('reconsiders a previously preferred side when a keyboard selection would cover a hub label', () => {
  const obstacle: Box = [450, 300, 800, 550];
  const p = placeCard([400, 400], [380, 380, 420, 420], [330, 220], [1440, 826], 'right', [obstacle]);
  expect(p.side === 'right' && p.top < 550 && p.top + 220 > 300).toBe(false);
  expect(p.pan).toEqual([0, 0]);
});

it('requests camera motion only after trying placements when no stationary screen area fits', () => {
  const obstacles: Box[] = [
    [0, 0, 1440, 300],
    [0, 450, 1440, 826],
  ];
  const p = placeCard([700, 400], [700, 400, 700, 400], [330, 220], [1440, 826], undefined, obstacles);
  expect(Math.hypot(...p.pan)).toBeGreaterThan(0);
  expect(p.left).toBeGreaterThanOrEqual(16);
  expect(p.top).toBeGreaterThanOrEqual(16);
  expect(p.left + 330).toBeLessThanOrEqual(1424);
  expect(p.top + 220).toBeLessThanOrEqual(810);
  for (const b of obstacles) {
    expect(
      p.left < b[2] + p.pan[0] &&
        p.left + 330 > b[0] + p.pan[0] &&
        p.top < b[3] + p.pan[1] &&
        p.top + 220 > b[1] + p.pan[1],
    ).toBe(false);
  }
});
