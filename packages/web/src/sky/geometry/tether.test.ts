import { describe, expect, it } from 'vitest';
import { TETHER_HOLD, tetherEnd } from './tether';

const star = (id: string, x: number, y: number, alpha = 1) => ({ id, point: [x, y] as [number, number], alpha });

describe('tetherEnd', () => {
  it('lands just short of the visible star nearest the cluster centre, not the nearest star', () => {
    expect(tetherEnd([0, 0], [star('a', 100, 0), star('b', 200, 0), star('c', 300, 0)], 8)).toEqual({
      id: 'b',
      end: [192, 0],
    });
  });
  it('ignores faded stars when finding the centre and gives up when nothing is visible', () => {
    expect(tetherEnd([0, 0], [star('a', 50, 0, 0.05), star('b', 0, 200)], 10)).toEqual({ id: 'b', end: [0, 190] });
    expect(tetherEnd([0, 0], [star('a', 50, 0, 0)], 10)).toBeNull();
    expect(tetherEnd([0, 0], [], 10)).toBeNull();
  });
  it('draws nothing when the hub star already sits on the anchor', () => {
    expect(tetherEnd([0, 0], [star('a', 12, 0)], 8)).toBeNull();
  });
  it('picks deterministically between equidistant stars and then holds that choice as the pair rotates', () => {
    let prev: string | undefined;
    const picks = new Set<string>();
    for (let i = 0; i < 360; i++) {
      const a = (i * Math.PI) / 180,
        dx = Math.cos(a) * 40,
        dy = Math.sin(a) * 40;
      const r = tetherEnd([0, 0], [star('HOST3', 300 + dx, 300 + dy), star('DESK2', 300 - dx, 300 - dy)], 7, prev);
      prev = r!.id;
      picks.add(prev);
    }
    expect([...picks]).toEqual(['DESK2']);
  });
  it('moves on once another star is clearly nearer the centre', () => {
    const stars = [star('a', 0, 100), star('b', 100, 100), star('c', 200 + TETHER_HOLD * 3, 100)];
    expect(tetherEnd([0, 0], stars, 7, 'a')!.id).toBe('b');
  });
});
