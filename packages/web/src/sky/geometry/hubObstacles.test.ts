import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { hubObstacles } from './hubObstacles';

it('includes all eight hub disks and their measured labels, excluding only the chosen group hub', () => {
  const { s, registry } = fixture();
  s.hubLabelBoxes = Array.from({ length: 8 }, (_, i) => [[i * 100, 120, i * 100 + 90, 150]]);
  expect(hubObstacles(s)).toHaveLength(16);
  expect(hubObstacles(s, 3)).toHaveLength(14);
  expect(hubObstacles(s, 3)).not.toContainEqual(s.hubLabelBoxes[3]![0]);
  Object.assign(s.cam, { s: 2, x: 20, y: 40 });
  expect(hubObstacles(s, 3)).toContainEqual([20, 280, 200, 340]);
  s.sky = false;
  expect(hubObstacles(s)).toEqual([]);
  registry.dispose();
});
