import '../../tests/support';
import { expect, it } from 'vitest';
import { skyNames } from './taskNames';
import { updateTasks } from './updateTasks';
import { fixture } from './testFixture';
import type { Task } from '../domain/types';

export const task = (id: string, code: string, systemKey = 'main'): Task => ({
  id,
  code,
  systemKey,
  title: 'Title',
  lane: 'risk',
  status: '',
  steps: [],
  reqIds: [],
  updatedAt: '2026-11-11',
});
it('disambiguates repeated codes per system without changing data, order or unique codes', () => {
  const tasks = [
    task('DESK5-DEFAULT', 'DESK5'),
    task('RISK-DRIFT', 'DESK5'),
    task('UX8-A', 'UX8'),
    task('UX8-B', 'UX8'),
    task('UNIQUE', 'CASH1'),
    task('OTHER', 'CASH1', 'other'),
  ];
  const copy = structuredClone(tasks),
    names = skyNames(tasks);
  expect([...names.values()]).toEqual(['DESK5-DEFAULT', 'RISK-DRIFT', 'UX8-A', 'UX8-B', 'CASH1', 'CASH1']);
  expect(tasks).toEqual(copy);
});
it('uses the same sky name for labels and tooltips while preserving board codes and removing stale duplicates', () => {
  const { s, registry } = fixture(),
    tasks = [task('DESK5-DEFAULT', 'DESK5'), task('RISK-DRIFT', 'DESK5')];
  updateTasks(s, tasks);
  const star = s.stars.get(tasks[0]!.id)!;
  expect(star.code).toBe('DESK5');
  expect(star.skyCode).toBe('DESK5-DEFAULT');
  const tips: string[] = [];
  s.events.onTooltip = (text) => tips.push(text);
  s.hover = star;
  s.onSky = true;
  s.emitTooltip();
  expect(tips.at(-1)).toContain('DESK5-DEFAULT');
  s.sky = false;
  s.emitTooltip();
  expect(tips.at(-1)).toBe('DESK5 Title');
  updateTasks(s, tasks.slice(0, 1));
  expect(star.skyCode).toBe('DESK5');
  registry.dispose();
});
