import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { hubObstacles } from './hubObstacles';
import { measureHubLabels } from './hubLabels';

it('includes all eight hub disks and their measured labels, excluding only the chosen group hub', () => {
  const { s, registry } = fixture();
  // Stale painted boxes must never replace fresh font measurements.
  s.hubLabelBoxes = Array.from({ length: 8 }, (_, i) => [[i * 100, 120, i * 100 + 90, 150]]);
  expect(hubObstacles(s)).toHaveLength(24);
  expect(hubObstacles(s, 3)).toHaveLength(21);
  expect(hubObstacles(s, 3)).not.toContainEqual(s.hubLabelBoxes[3]![0]);
  Object.assign(s.cam, { s: 2, x: 20, y: 40 });
  const [b] = measureHubLabels(s)[0]!;
  expect(hubObstacles(s, 3)).toContainEqual([b![0] * 2 + 20, b![1] * 2 + 40, b![2] * 2 + 20, b![3] * 2 + 40]);
  s.sky = false;
  expect(hubObstacles(s)).toEqual([]);
  registry.dispose();
});
