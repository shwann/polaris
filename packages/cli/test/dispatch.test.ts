import { afterEach, expect, test, vi } from 'vitest';
import { boot } from './helpers.js';
import { showDispatch } from '../src/service/dispatch.js';
import { snapshot } from '../src/export/snapshot.js';
import { run } from '../src/commands/run.js';
import { sessionStart } from '../src/commands/hook.js';
import { dispatchDate, validateSnapshot } from '@polaris/core';

const setting = ['--engine', 'codex', '--model', 'gpt-6.1-sol', '--effort', 'xhigh', '--note', '原话示例'];
const keys = ['system', 'engine', 'model', 'effort', 'note', 'by', 'actor', 'setAt', 'source'];
afterEach(() => vi.restoreAllMocks());

test('set appends history, resolves newest first even at the same timestamp and exports stable JSON keys', async () => {
  const { db, write, home } = boot();
  write('dispatch', 'set', ...setting);
  write('dispatch', 'set', ...setting, '--model', 'new-model', '--by', '负责人');
  const result = showDispatch(db, 'beidou', undefined, true);
  expect(result).toMatchObject({ current: { model: 'new-model', by: '负责人', actor: 'test', source: 'system' } });
  if (!('history' in result)) throw new Error('history expected');
  expect(result.history.map((d) => d.model)).toEqual(['new-model', 'gpt-6.1-sol']);
  expect(Object.keys(result.current)).toEqual(keys);
  expect(result.history.every((d) => JSON.stringify(Object.keys(d)) === JSON.stringify(keys))).toBe(true);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await run(['dispatch', 'show', '--home', home, '--system', 'beidou', '--json']);
  expect(Object.keys(JSON.parse(log.mock.calls.at(-1)![0] as string))).toEqual(keys);
  await run(['dispatch', 'show', '--home', home, '--history', '--json']);
  const json = JSON.parse(log.mock.calls.at(-1)![0] as string);
  expect(Object.keys(json)).toEqual(['current', 'history']);
  expect(json.history).toHaveLength(2);
  expect(Object.keys(json.history[0])).toEqual(keys);
  db.run('UPDATE dispatch_settings SET set_at=?', result.current.setAt);
  expect(showDispatch(db)).toMatchObject({ model: 'new-model' });
});

test.each([
  ['--engine', 'other', 'engine 只能'],
  ['--effort', 'max', 'effort 只能'],
  ['--model', '', 'model 必须非空'],
  ['--model', '   ', 'model 必须非空'],
])('rejects invalid dispatch %s=%s with a Chinese error and no writes', (flag, value, error) => {
  const { db, write } = boot();
  const before = db.all('SELECT * FROM changes');
  expect(() => write('dispatch', 'set', ...setting, flag, value)).toThrow(error);
  expect(db.all('SELECT * FROM dispatch_settings')).toEqual([]);
  expect(db.all('SELECT * FROM changes')).toEqual(before);
});

test('Claude accepts max but rejects minimal; task override validation uses the same enums', () => {
  const { write } = boot();
  write('dispatch', 'set', ...setting, '--engine', 'claude', '--effort', 'max');
  expect(() => write('dispatch', 'set', ...setting, '--engine', 'claude', '--effort', 'minimal')).toThrow('effort');
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  for (const value of ['codex/model', 'other/model/high', 'codex//high', 'codex/model/max'])
    expect(() => write('task', 'update', 'T1', '--dispatch', value)).toThrow(/[三段只非]/);
});

test('task overrides resolve in their own system, survive system changes, and clear back to the latest system setting', async () => {
  const { db, write, home } = boot();
  write('dispatch', 'set', ...setting);
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  write('task', 'update', 'T1', '--dispatch', 'claude/opus/medium');
  expect(showDispatch(db, 'wrong-system', 'T1')).toMatchObject({
    system: 'beidou',
    engine: 'claude',
    model: 'opus',
    effort: 'medium',
    source: 'task',
    task: 'T1',
    note: '',
    by: '用户',
    actor: 'test',
    setAt: snapshot(db).tasks[0]!.updatedAt,
  });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await run(['dispatch', 'show', '--task', 'T1', '--home', home, '--json']);
  expect(Object.keys(JSON.parse(log.mock.calls.at(-1)![0] as string))).toEqual([...keys, 'task']);
  await run(['dispatch', 'show', '--task', 'T1', '--history', '--home', home, '--json']);
  const history = JSON.parse(log.mock.calls.at(-1)![0] as string);
  expect(Object.keys(history)).toEqual(['current', 'history']);
  expect(Object.keys(history.current)).toEqual([...keys, 'task']);
  expect(Object.keys(history.history[0])).toEqual([...keys, 'task']);
  expect(history.history[0].source).toBe('system');
  write('dispatch', 'set', ...setting, '--model', 'latest');
  expect(showDispatch(db, undefined, 'T1')).toMatchObject({ model: 'opus' });
  write('task', 'update', 'T1', '--dispatch', '');
  expect(showDispatch(db, undefined, 'T1')).toMatchObject({ model: 'latest', source: 'system', task: 'T1' });
  expect(snapshot(db).tasks[0]!.dispatchEngine).toBeUndefined();
});

test('executor records its own timestamp, preserves it on other edits and clears both fields', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  const original = snapshot(db).tasks[0];
  const changed = write('task', 'update', 'T1', '--executor', 'Codex gpt-6.1-sol xhigh｜wt x｜会话 y');
  const task = snapshot(db).tasks[0]!;
  expect(task.executor).toBe('Codex gpt-6.1-sol xhigh｜wt x｜会话 y');
  expect(task.executorAt).toBe(task.updatedAt);
  const progress = write('task', 'update', 'T1', '--progress', '20');
  expect(snapshot(db).tasks[0]!.executorAt).toBe(task.executorAt);
  const cleared = write('task', 'update', 'T1', '--executor', '');
  expect(db.get('SELECT executor,executor_at FROM tasks')).toEqual({ executor: null, executor_at: null });
  write('undo', cleared.batch);
  expect(snapshot(db).tasks[0]!.executorAt).toBe(task.executorAt);
  write('undo', progress.batch);
  write('undo', changed.batch);
  expect(snapshot(db).tasks[0]!.executor).toBe(original!.executor);
});

test('undo dispatch set removes its history row and restores the previous current setting and activity', () => {
  const { db, write } = boot();
  const first = write('dispatch', 'set', ...setting);
  const second = write('dispatch', 'set', ...setting, '--model', 'latest');
  expect(db.all("SELECT * FROM changes WHERE batch=? AND entity='dispatch_settings'", second.batch)).not.toHaveLength(
    0,
  );
  expect(snapshot(db).events[0]).toMatchObject({ systemKey: 'beidou' });
  expect(snapshot(db).events[0]!.text).toContain('设置系统 beidou 派工');
  write('undo', second.batch);
  expect(showDispatch(db)).toMatchObject({ model: 'gpt-6.1-sol' });
  expect(db.all('SELECT * FROM dispatch_settings')).toHaveLength(1);
  write('undo', first.batch);
  expect(() => showDispatch(db)).toThrow('尚未设置派工');
});

test('hook adds a local-date dispatch line before needs, packs multiple systems within five lines, and skips unset systems', async () => {
  const { db, write, home } = boot();
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await sessionStart(['--home', home]);
  expect(log.mock.calls.at(-1)![0]).not.toContain('派工：');
  write('dispatch', 'set', ...setting);
  const d = showDispatch(db);
  if ('current' in d) throw new Error('current expected');
  const text = `派工：Codex gpt-6.1-sol / xhigh（${dispatchDate(d.setAt)} 用户定）`;
  await sessionStart(['--home', home]);
  expect(log.mock.calls.at(-1)![0]).toContain(text + '\n需要你：');
  for (let i = 1; i < 5; i++) write('system', 'add', `s${i}`, '--name', `示例${i}`, '--constellation', `星座${i}`);
  write('dispatch', 'set', '--system', 's1', ...setting, '--engine', 'claude');
  await sessionStart(['--home', home]);
  const lines = String(log.mock.calls.at(-1)![0]).split('\n');
  expect(lines).toHaveLength(5);
  expect(lines[3]).toContain('派工：北斗 Codex');
  expect(lines[3]).toContain('；星座1 Claude');
  expect(lines[3]).not.toContain('星座2');
});

test('snapshot keeps the last five settings and validates incomplete task overrides and invalid dispatch times', () => {
  const { db, write } = boot();
  for (let i = 0; i < 7; i++) write('dispatch', 'set', ...setting, '--model', `model-${i}`);
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  const data = snapshot(db);
  expect(data.schema).toBe(1);
  expect(data.systems[0]!.dispatch!.history.map((d) => d.model)).toEqual([
    'model-6',
    'model-5',
    'model-4',
    'model-3',
    'model-2',
  ]);
  expect(db.all('SELECT * FROM dispatch_settings')).toHaveLength(7);
  expect(data.systems[0]!.dispatch!.models).toEqual({ codex: Array.from({ length: 7 }, (_, i) => `model-${i}`) });
  write('system', 'add', 'other', '--name', '其他');
  write('dispatch', 'set', ...setting, '--system', 'other', '--model', 'other-model');
  expect(snapshot(db).systems.find((s) => s.key === 'beidou')!.dispatch!.models?.codex).not.toContain('other-model');
  data.tasks[0]!.dispatchEngine = 'codex';
  data.systems[0]!.dispatch!.current.setAt = 'invalid';
  expect(
    validateSnapshot(data)
      .map((i) => i.message)
      .join('；'),
  ).toMatch(/model 必须非空/);
  expect(
    validateSnapshot(data)
      .map((i) => i.message)
      .join('；'),
  ).toMatch(/setAt/);
});
