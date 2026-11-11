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
