import { describe, expect, it } from 'vitest';
import { tetherEnd } from './tether';

describe('tetherEnd', () => {
  it('lands just short of the visible star nearest the cluster centre, not the nearest star', () => {
    const end = tetherEnd(
      [0, 0],
      [
        { point: [100, 0], alpha: 1 },
        { point: [200, 0], alpha: 1 },
        { point: [300, 0], alpha: 1 },
      ],
      8,
    );
    expect(end).toEqual([192, 0]);
  });
  it('ignores faded or dead stars when finding the centre and gives up when nothing is visible', () => {
    expect(
      tetherEnd(
        [0, 0],
        [
          { point: [50, 0], alpha: 0.05 },
          { point: [0, 200], alpha: 1 },
        ],
        10,
      ),
    ).toEqual([0, 190]);
    expect(tetherEnd([0, 0], [{ point: [50, 0], alpha: 0 }], 10)).toBeNull();
    expect(tetherEnd([0, 0], [], 10)).toBeNull();
  });
  it('draws nothing when the hub star already sits on the anchor', () => {
    expect(tetherEnd([0, 0], [{ point: [12, 0], alpha: 1 }], 8)).toBeNull();
  });
});
