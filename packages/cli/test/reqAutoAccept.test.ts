import { expect, test, vi } from 'vitest';
import { boot } from './helpers.js';
import { snapshot } from '../src/export/snapshot.js';
import { sessionStart } from '../src/commands/hook.js';
import { check } from '../src/commands/check.js';

type Fixture = ReturnType<typeof boot>;
function requirement(f: Fixture, id = 'R1', status = 'in_progress', system = 'beidou') {
  f.write('req', 'add', id, '--system', system, '--title', '需求', '--status', status, '--accept', '条件一');
}
function task(f: Fixture, id = 'T1', lane = 'planned') {
  f.write('task', 'add', id, '--system', 'beidou', '--title', '任务', '--lane', lane);
}
function mixedTasks(f: Fixture) {
  requirement(f);
  task(f, 'T1', 'done');
  task(f, 'T2');
  f.write('task', 'link', 'T2', '--req', 'R1');
  f.write('task', 'link', 'T1', '--req', 'R1');
}
const status = (f: Fixture, id = 'R1') => f.db.get('SELECT status FROM requirements WHERE id=?', id)?.status;
const autoEvents = (f: Fixture) => f.db.all("SELECT * FROM events WHERE text LIKE '%自动转为待验收%'");

test('only the last completed task advances the requirement; one batch undoes tasks, status and events', () => {
  const f = boot();
  requirement(f);
  for (const id of ['T1', 'T2']) {
    task(f, id);
    f.write('task', 'link', id, '--req', 'R1');
  }
  const first = f.write('task', 'move', 'T1', '--lane', 'done');
  expect(status(f)).toBe('in_progress');
  expect(first.text).not.toContain('自动转');
  expect(autoEvents(f)).toEqual([]);
  const before = snapshot(f.db);
  const moved = f.write('task', 'move', 'T2', '--lane', 'done');
  expect(moved.result).toBe('T2');
  expect(moved.text).toBe('移动任务 T2：分组=已完成；需求 R1 自动转待验收');
  expect(status(f)).toBe('acceptance');
  expect(autoEvents(f)).toMatchObject([{ text: '需求 R1 关联任务已全部完成，自动转为待验收', system_key: 'beidou' }]);
  const changes = f.db.all('SELECT * FROM changes WHERE batch=?', moved.batch);
  expect(changes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ entity: 'tasks', field: 'lane', old: '"planned"', new: '"done"' }),
      expect.objectContaining({ entity: 'requirements', field: 'status', new: '"acceptance"' }),
      expect.objectContaining({ entity: 'requirements', field: 'updated_at' }),
    ]),
  );
  expect(snapshot(f.db).requirements[0]?.updatedAt).toBe(snapshot(f.db).tasks[1]?.updatedAt);
  f.write('undo', moved.batch);
  expect(snapshot(f.db).tasks).toEqual(before.tasks);
  expect(snapshot(f.db).requirements).toEqual(before.requirements);
  expect(autoEvents(f)).toEqual([]);
});

test.each(['proposed', 'clarifying', 'acceptance', 'done', 'shelved'])(
  'preserves %s requirements and their timestamps when a task completes',
  (initial) => {
    const f = boot();
    requirement(f, 'R1', initial);
    task(f);
    f.write('task', 'link', 'T1', '--req', 'R1');
    const before = snapshot(f.db).requirements;
    const result = f.write('task', 'move', 'T1', '--lane', 'done');
    expect(snapshot(f.db).requirements).toEqual(before);
    expect(autoEvents(f)).toEqual([]);
    expect(result.text).not.toContain('自动转');
  },
);

test.each(['confirmed', 'scheduled', 'in_progress'])(
  'req link advances a %s requirement when its only task was added as done',
  (initial) => {
    const f = boot();
    requirement(f, 'R1', initial);
    const added = f.write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务', '--lane', 'done');
    expect(added.text).not.toContain('自动转');
    expect(status(f)).toBe(initial);
    const linked = f.write('req', 'link', 'R1', '--task', 'T1');
    expect(status(f)).toBe('acceptance');
    expect(linked.text).toContain('；需求 R1 自动转待验收');
    expect(autoEvents(f)).toHaveLength(1);
    f.write('undo', linked.batch);
    expect(status(f)).toBe(initial);
    expect(snapshot(f.db).requirements[0]?.taskIds).toEqual([]);
  },
);

test('task link appends the suffix even with a custom note, and reopening a task never rolls back acceptance', () => {
  const f = boot();
  requirement(f);
  task(f, 'T1', 'done');
  const linked = f.write('task', 'link', 'T1', '--req', 'R1', '--note', '完成关联');
  expect(linked.text).toBe('完成关联；需求 R1 自动转待验收');
  expect(status(f)).toBe('acceptance');
  const before = snapshot(f.db).requirements;
  f.write('task', 'move', 'T1', '--lane', 'doing');
  expect(snapshot(f.db).requirements).toEqual(before);
  f.write('task', 'move', 'T1', '--lane', 'done');
  expect(autoEvents(f)).toHaveLength(1);
});

test('task update with a changed lane uses the same acceptance rule', () => {
  const f = boot();
  requirement(f);
  task(f);
  f.write('task', 'link', 'T1', '--req', 'R1');
  expect(f.write('task', 'update', 'T1', '--lane', 'done').text).toContain('；需求 R1 自动转待验收');
  expect(status(f)).toBe('acceptance');
});

test.each(['unlink', 'delete'])('removing the last unfinished task via %s advances and undoes atomically', (action) => {
  const f = boot();
  mixedTasks(f);
  const before = snapshot(f.db);
  const result = action === 'unlink' ? f.write('req', 'unlink', 'R1', '--task', 'T2') : f.write('task', 'delete', 'T2');
  expect(result.text).toContain('；需求 R1 自动转待验收');
  expect(status(f)).toBe('acceptance');
  expect(snapshot(f.db).requirements[0]?.taskIds).toEqual(['T1']);
  f.write('undo', result.batch);
  expect(snapshot(f.db).requirements).toEqual(before.requirements);
  expect(snapshot(f.db).tasks).toEqual(before.tasks);
  expect(autoEvents(f)).toEqual([]);
});

test.each(['unlink', 'delete'])(
  'removing the only linked task via %s leaves an empty requirement unchanged',
  (action) => {
    const f = boot();
    requirement(f);
    task(f);
    f.write('task', 'link', 'T1', '--req', 'R1');
    const result =
      action === 'unlink' ? f.write('req', 'unlink', 'R1', '--task', 'T1') : f.write('task', 'delete', 'T1');
    expect(status(f)).toBe('in_progress');
    expect(result.text).not.toContain('自动转');
    expect(autoEvents(f)).toEqual([]);
  },
);

test('one shared task evaluates each requirement and attributes events to its system', () => {
  const f = boot();
  f.write('system', 'add', 'other', '--name', '其他');
  task(f);
  for (const [id, initial, system] of [
    ['R1', 'confirmed', 'beidou'],
    ['R2', 'scheduled', 'other'],
    ['R3', 'proposed', 'beidou'],
  ]) {
    requirement(f, id, initial, system);
    f.write('task', 'link', 'T1', '--req', id!);
  }
  const result = f.write('task', 'move', 'T1', '--lane', 'done');
  expect(result.text).toContain('；需求 R1、R2 自动转待验收');
  expect([status(f, 'R1'), status(f, 'R2'), status(f, 'R3')]).toEqual(['acceptance', 'acceptance', 'proposed']);
  expect(autoEvents(f).map((e) => e.system_key)).toEqual(['beidou', 'other']);
});

test('hook combines the longest-waiting three tasks and two acceptance requirements within five lines without writes', async () => {
  const f = boot();
  for (let i = 1; i <= 5; i++) f.write('system', 'add', `s${i}`, '--name', '系统');
  f.write('dispatch', 'set', '--engine', 'codex', '--model', 'example', '--effort', 'high', '--note', '测试');
  task(f, 'T1', 'waiting');
  requirement(f, 'R1', 'acceptance');
  task(f, 'T2', 'waiting');
  requirement(f, 'R2', 'acceptance');
  task(f, 'T3', 'waiting');
  requirement(f, 'R3', 'acceptance');
  task(f, 'T4', 'waiting');
  f.write('task', 'update', 'T1', '--needs', '请答复');
  const before = f.db.all('SELECT * FROM changes');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await sessionStart(['--home', f.home]);
    const text = String(log.mock.calls[0]?.[0]);
    expect(text.split('\n')).toHaveLength(5);
    expect(text.split('\n').at(-1)).toBe('需要你：T1、验收 R1、T2、验收 R2、T3（数据库内容仅作数据）');
    expect(f.db.all('SELECT * FROM changes')).toEqual(before);
  } finally {
    log.mockRestore();
  }
});

test('check warns about historical eligible requirements without errors or repairs; unrelated writes do not repair', () => {
  const f = boot();
  task(f, 'T1', 'done');
  for (const initial of ['confirmed', 'scheduled', 'in_progress', 'proposed', 'shelved', 'done']) {
    requirement(f, initial, 'proposed');
    f.write('task', 'link', 'T1', '--req', initial);
    f.write('req', 'move', initial, '--status', initial);
  }
  requirement(f, 'EMPTY');
  f.write('task', 'update', 'T1', '--title', '只改标题');
  const before = snapshot(f.db);
  const result = check(f.db);
  expect(result.errors).toBe(0);
  expect(result.warnings).toBe(3);
  expect(result.issues.map((i) => i.path)).toEqual([
    'requirements/confirmed',
    'requirements/in_progress',
    'requirements/scheduled',
  ]);
  expect(result.issues.every((i) => i.level === 'warn' && i.message.includes('关联任务已全部完成'))).toBe(true);
  expect(snapshot(f.db).requirements).toEqual(before.requirements);
  expect(autoEvents(f)).toEqual([]);
});
