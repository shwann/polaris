import { expect, test } from 'vitest';
import { boot, count } from './helpers.js';
import { snapshot } from '../src/export/snapshot.js';
import { status } from '../src/commands/status.js';

test('waiting_since is set on entry, preserved while waiting and cleared on exit', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  write('task', 'move', 'T1', '--lane', 'waiting');
  const since = snapshot(db).tasks[0]!.waitingSince;
  expect(since).toBeTruthy();
  write('task', 'update', 'T1', '--status', '继续等');
  expect(snapshot(db).tasks[0]!.waitingSince).toBe(since);
  write('task', 'move', 'T1', '--lane', 'doing');
  expect(snapshot(db).tasks[0]!.waitingSince).toBeUndefined();
  write('task', 'move', 'T1', '--lane', 'waiting');
  expect(snapshot(db).tasks[0]!.waitingSince).not.toBe(since);
});

test('release updates app, rollback, history and shipped tasks atomically; undo reverses it', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务', '--target-release', '.2');
  write('release', 'record', '--system', 'beidou', '--version', '.1', '--build', 'build1');
  const before = snapshot(db);
  const result = write(
    'release',
    'record',
    '--system',
    'beidou',
    '--version',
    '.2',
    '--build',
    'build2',
    '--tasks',
    'T1',
    '--note',
    '发布第二版',
  );
  const data = snapshot(db);
  expect(data.systems[0]!.app).toMatchObject({ version: '.2', rollback: '.1', build: 'build2' });
  expect(data.systems[0]!.releases).toHaveLength(2);
  expect(data.tasks[0]!.shippedIn).toBe('.2');
  expect(data.tasks[0]!.targetRelease).toBeUndefined();
  expect(data.events[0]!.text).toBe('发布第二版');
  const changes = count(db, 'changes');
  expect(() => write('release', 'record', '--system', 'beidou', '--version', '.3', '--tasks', 'MISSING')).toThrow();
  expect(count(db, 'changes')).toBe(changes);
  expect(() => write('release', 'record', '--system', 'beidou', '--version', '.4', '--released-at', 'invalid')).toThrow(
    'ISO',
  );
  expect(snapshot(db).systems).toEqual(data.systems);
  write('undo', result.batch);
  expect(snapshot(db).systems).toEqual(before.systems);
  expect(snapshot(db).tasks).toEqual(before.tasks);
});

test('requirements accept repeated criteria, Chinese enums, bidirectional task links, steps and deletion undo', () => {
  const { db, write } = boot();
  write(
    'req',
    'add',
    'R1',
    '--system',
    'beidou',
    '--title',
    '需求',
    '--source',
    '客户',
    '--accept',
    '标准一',
    '--accept',
    '标准二',
    '--refs',
    'docs/spec.md',
  );
  write('req', 'move', 'R1', '--status', '已确认');
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  write('task', 'step', 'T1', '--seq', '1', '--name', '实施', '--state', 'doing');
  write('task', 'link', 'T1', '--req', 'R1');
  const data = snapshot(db);
  expect(data.requirements[0]).toMatchObject({
    source: 'customer',
    status: 'confirmed',
    taskIds: ['T1'],
    acceptance: [
      { text: '标准一', met: false },
      { text: '标准二', met: false },
    ],
  });
  expect(data.tasks[0]).toMatchObject({ reqIds: ['R1'], steps: [{ name: '实施', state: 'doing' }] });
  write('req', 'unlink', 'R1', '--task', 'T1');
  expect(snapshot(db).tasks[0]!.reqIds).toEqual([]);
  write('req', 'link', 'R1', '--task', 'T1');
  const original = snapshot(db).tasks;
  const deleted = write('task', 'delete', 'T1');
  expect(snapshot(db).tasks).toEqual([]);
  write('undo', deleted.batch);
  expect(snapshot(db).tasks).toEqual(original);
  expect(db.all('PRAGMA foreign_key_check')).toEqual([]);
});

test('status orders waiting by age, marks over three days and reports completion and candidates', () => {
  const { db, write } = boot();
  write('task', 'add', 'W1', '--system', 'beidou', '--title', '等待', '--lane', 'waiting');
  write('task', 'add', 'D1', '--system', 'beidou', '--title', '完成', '--lane', 'done');
  write('task', 'add', 'R1', '--system', 'beidou', '--title', '候选', '--lane', 'release');
  write('task', 'add', 'U1', '--system', 'beidou', '--title', '验证', '--unverified', '需验收');
  const result = status(snapshot(db), 'beidou', Date.parse('2026-11-16T00:00:00Z'));
  expect(result.waiting[0]).toMatchObject({ id: 'W1', late: true, days: 4 });
  expect(result.candidates.map((t) => t.id)).toEqual(['R1']);
  expect(result.unverified.map((t) => t.id)).toEqual(['U1']);
  expect(result.completion).toBe(25);
});

test('snapshot timestamps and events compare actual instants across ISO timezone offsets', async () => {
  const { db, home, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  db.run("UPDATE tasks SET updated_at='2026-11-11T13:00:00+08:00' WHERE id='T1'");
  db.run("INSERT INTO events(id,at,text) VALUES('offset-event','2026-11-11T13:00:00+08:00','较早动态')");
  const { write: auditedWrite } = await import('../src/service/context.js');
  const { config } = await import('../src/config.js');
  auditedWrite({ db, config: config({ home }), at: '2026-11-11T06:00:00Z' }, '最新动态', () => null);
  const data = snapshot(db);
  expect(data.events[0]!.text).toBe('最新动态');
  expect(data.updatedAt).toBe('2026-11-11T06:00:00Z');
});

test('system events use the actual key and undo can remove a system selected in --system', () => {
  const { db, write } = boot();
  const result = write('system', 'add', 'other', '--system', 'not-created', '--name', '另一个系统');
  expect(snapshot(db).events[0]!.systemKey).toBe('other');
  write('undo', result.batch, '--system', 'other');
  expect(snapshot(db).systems.map((s) => s.key)).toEqual(['beidou']);
  expect(snapshot(db).events[0]!.text).toContain('撤销');
});
