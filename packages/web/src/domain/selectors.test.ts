import { describe, expect, it } from 'vitest';
import { sample } from '../../tests/fixtures/sample';
import { ageText, waitingDays, DAY } from './time';
import {
  selectView,
  filterSystem,
  needsYouCount,
  nextCandidates,
  completion,
  matches,
  taskProgress,
  shipped,
  unverified,
  archiveTasks,
} from './selectors';
const now = +new Date('2026-11-11T10:00:00+08:00');
describe('legacy sample domain behavior', () => {
  it('converts all seven sample tasks without losing lanes and app releases', () => {
    expect(sample.tasks).toHaveLength(7);
    expect(sample.systems[0]?.releases).toHaveLength(2);
  });
  it('uses waitingSince and falls back to updatedAt, including exact threshold and future dates', () => {
    const t = sample.tasks.find((t) => t.id === 'EXPORT')!;
    expect(waitingDays(t, now)).toBe(4);
    expect(ageText(t, now)).toEqual(['已等 4 天', true]);
    expect(ageText({ ...t, waitingSince: undefined }, now)).toEqual(['已等 1 小时', false]);
    expect(ageText({ ...t, waitingSince: new Date(now - 3 * DAY).toISOString() }, now)[1]).toBe(true);
    expect(ageText({ ...t, waitingSince: new Date(now + DAY).toISOString() }, now)).toEqual(['', false]);
  });
  it('counts needs, including waiting without needs and trimmed empty needs', () => {
    expect(needsYouCount(sample.tasks)).toBe(1);
    const t = sample.tasks[0]!;
    expect(
      needsYouCount([
        { ...t, needs: ' ' },
        { ...t, needs: '批准' },
        { ...t, lane: 'waiting', needs: '' },
      ]),
    ).toBe(2);
  });
  it('separates candidates, shipped work and unverified, excluding release plans', () => {
    expect(nextCandidates(sample.tasks, '1.3').map((t) => t.code)).toEqual(['SEARCH']);
    expect(
      nextCandidates([...sample.tasks, { ...sample.tasks[0]!, code: 'REL3', targetRelease: '1.3' }], '1.3'),
    ).toHaveLength(1);
    expect(shipped(sample.tasks, '1.2')).toHaveLength(2);
    expect(unverified(sample.tasks)).toHaveLength(1);
  });
  it('computes completion and task progress, including zero totals and explicit progress', () => {
    expect(completion(sample.tasks)).toMatchObject({ total: 7, done: 2, percent: 29 });
    expect(completion([]).percent).toBe(0);
    const t = sample.tasks.find((t) => t.code === 'LOGIN')!;
    expect(taskProgress(t)).toBe(60);
    expect(taskProgress({ ...t, progress: undefined })).toBe(33);
    expect(taskProgress({ ...t, progress: undefined, steps: [] })).toBeNull();
  });
  it('matches all search words case-insensitively across fields and mine filter', () => {
    const t = sample.tasks.find((t) => t.code === 'EXPORT')!;
    expect(matches(t, { query: 'export CSV', mineOnly: true })).toBe(true);
    expect(matches(t, { query: 'LOGIN', mineOnly: false })).toBe(false);
    expect(matches(sample.tasks[0]!, { query: '', mineOnly: true })).toBe(false);
  });
  it('filters systems and all and falls back to the first system for stale storage', () => {
    const tasks = [...sample.tasks, { ...sample.tasks[0]!, id: 'other', systemKey: 'second' }];
    expect(filterSystem(tasks, 'main')).toHaveLength(7);
    expect(filterSystem(tasks, 'second')).toHaveLength(1);
    expect(filterSystem(tasks, 'all')).toBe(tasks);
    expect(selectView(sample, 'missing').systemKey).toBe('main');
    expect(selectView(sample, 'all').tasks).toHaveLength(7);
  });
  it('archives only completed tasks older than three days', () => {
    const t = sample.tasks.find((t) => t.lane === 'done')!;
    expect(
      archiveTasks([t, { ...t, id: 'old', updatedAt: new Date(now - 4 * DAY).toISOString() }], now).older.map(
        (t) => t.id,
      ),
    ).toEqual(['old']);
  });
});

it('keeps legacy version-only boards on their note fallback instead of inventing app layers', async () => {
  const { normalize } = await import('../data/normalize');
  const s = normalize({ board: { appVersion: '1.0', appNote: '正式 App 说明' }, tasks: [] });
  expect(selectView(s, 'main')).toMatchObject({ app: null, appVersion: '1.0', appNote: '正式 App 说明' });
});
