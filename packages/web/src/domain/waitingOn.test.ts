import { expect, it } from 'vitest';
import { sample } from '../../tests/fixtures/sample';
import { laneModel } from './laneModel';
import { lateTasks, matches, needsMe, needsYouCount, selectView, waitCounts, waitingOnOf } from './selectors';
import { figures, waitFigureNote } from './presentation';
import type { Task } from './types';

const base = sample.tasks.find((t) => t.id === 'EXPORT')!;
const make = (id: string, patch: Partial<Task>): Task => ({ ...base, id, code: id, ...patch });
const now = +new Date('2026-11-11T10:00:00+08:00');
const tasks = [
  make('U1', { waitingOn: undefined }),
  make('U2', { waitingOn: 'user' }),
  make('C1', { waitingOn: 'customer' }),
  make('P1', { waitingOn: 'dependency', needs: undefined }),
  make('P2', { waitingOn: 'dependency', needs: '等 ACC1' }),
  make('N1', { lane: 'doing', needs: '看一眼', waitingOn: undefined }),
  make('D1', { lane: 'doing', needs: undefined, waitingOn: undefined }),
];

it('treats a missing waitingOn on a waiting task (or one with needs) as 等你', () => {
  expect(tasks.map(waitingOnOf)).toEqual(['user', 'user', 'customer', 'dependency', 'dependency', 'user', undefined]);
  expect(needsMe(tasks[0]!)).toBe(true);
  expect(needsMe(tasks[2]!)).toBe(false);
  expect(needsYouCount(tasks)).toBe(3);
  expect(waitCounts(tasks)).toEqual({ user: 3, customer: 1, dependency: 2 });
  expect(matches(tasks[2]!, { query: '', mineOnly: true } as never)).toBe(false);
  expect(matches(tasks[5]!, { query: '', mineOnly: true } as never)).toBe(true);
});

it('flags lateness and fills the waiting figure from 等你 only', () => {
  expect(lateTasks(tasks, now).map((t) => t.id)).toEqual(['U1', 'U2']);
  expect(waitFigureNote(tasks, now)).toEqual(['等客户 1', '等前置 2']);
  expect(
    waitFigureNote(
      tasks.filter((t) => !t.waitingOn || t.waitingOn === 'user'),
      now,
    ),
  ).toEqual(['2 项已超过 3 天']);
  const view = { ...selectView(null, 'main'), tasks };
  const card = figures(view, now).find((f) => f.label === '等你')!;
  expect(card).toMatchObject({ value: 2, notes: ['等客户 1', '等前置 2'] });
});

it('splits the waiting lane into 等你, 等客户, 等前置 sections, leaving empty ones out', () => {
  const m = laneModel(tasks, { query: '', mineOnly: false } as never, now, true);
  const waiting = m.full[0]!;
  expect(waiting.parts!.map((p) => [p.key, p.list.map((t) => t.id)])).toEqual([
    ['user', ['U1', 'U2']],
    ['customer', ['C1']],
    ['dependency', ['P1', 'P2']],
  ]);
  const mine = laneModel(tasks, { query: '', mineOnly: true } as never, now, true).full[0]!;
  expect(mine.parts!.map((p) => p.key)).toEqual(['user']);
});
