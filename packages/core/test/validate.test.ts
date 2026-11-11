import { expect, it } from 'vitest';
import { validateSnapshot } from '../src/validate.js';
import type { Snapshot } from '../src/types.js';

const snapshot = (times: string[]): Snapshot => ({
  schema: 1,
  generatedAt: '2026-11-11T00:00:00Z',
  systems: [{ key: 'main', name: '系统', constellation: '北斗', sort: 0, app: null, releases: [] }],
  tasks: [],
  requirements: [],
  events: times.map((at) => ({ at, text: '动态' })),
});

it('accepts descending events across UTC and offset timestamps, including equal instants', () => {
  expect(
    validateSnapshot(snapshot(['2026-11-11T01:00:00Z', '2026-11-11T08:30:00+08:00', '2026-11-11T00:30:00Z'])),
  ).toEqual([]);
});

it('still warns when an offset timestamp denotes a newer event after an older one', () => {
  expect(validateSnapshot(snapshot(['2026-11-11T08:30:00+08:00', '2026-11-11T01:00:00Z']))).toContainEqual({
    level: 'warn',
    path: 'events',
    message: '动态不是新的在前',
  });
});
