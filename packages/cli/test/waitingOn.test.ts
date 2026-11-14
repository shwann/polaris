import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { boot, temp } from './helpers.js';
import { setup } from './httpSetup.js';
import { snapshot } from '../src/export/snapshot.js';
import { connect } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { dump, restore } from '../src/export/backup.js';
import { sessionStart } from '../src/commands/hook.js';
import init from '../src/db/migrations/0001_init.sql?raw';
import dispatch from '../src/db/migrations/0002_dispatch.sql?raw';

afterEach(() => vi.restoreAllMocks());

function v2Database() {
  const home = temp(),
    path = join(home, 'polaris.db'),
    db = connect(path, false);
  db.exec(init);
  db.exec(dispatch);
  db.run('INSERT INTO schema_version VALUES (1,?),(2,?)', '2026-11-11T00:00:00Z', '2026-11-12T00:00:00Z');
  db.run("INSERT INTO systems(key,constellation,name) VALUES ('beidou','北斗','旧系统')");
  db.run(`INSERT INTO tasks(id,system_key,code,title,lane,status,needs,waiting_since,updated_at) VALUES
    ('W1','beidou','W1','等答复','waiting','等答复','请确认','2026-11-10T00:00:00Z','2026-11-10T00:00:00Z'),
    ('D1','beidou','D1','开发','doing','开发中',NULL,NULL,'2026-11-11T00:00:00Z')`);
  return { home, path, db };
}
const task = (db: ReturnType<typeof boot>['db'], id: string) => snapshot(db).tasks.find((t) => t.id === id)!;
const hookText = async (home: string) => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await sessionStart(['--home', home]);
  return String(log.mock.calls.at(-1)![0]);
};

test('v2 upgrades to the latest schema with a pre-migration backup, intact rows and a NULL waiting_on', () => {
  const { home, path, db } = v2Database();
  try {
    migrate(db, path);
    expect(db.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(4);
    expect(db.all('SELECT id,lane,needs,waiting_on FROM tasks ORDER BY id')).toEqual([
      { id: 'D1', lane: 'doing', needs: null, waiting_on: null },
      { id: 'W1', lane: 'waiting', needs: '请确认', waiting_on: null },
    ]);
    expect(snapshot(db).tasks.find((t) => t.id === 'W1')).not.toHaveProperty('waitingOn');
    expect(() => db.run("UPDATE tasks SET waiting_on='boss' WHERE id='W1'")).toThrow();
    const main = readdirSync(home).find((p) => p.includes('.before-migration-') && !p.endsWith('-wal'))!;
    expect(existsSync(join(home, main))).toBe(true);
    const backup = connect(join(home, main), false);
    try {
      expect(backup.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(2);
      expect(backup.all('SELECT id FROM tasks ORDER BY id')).toEqual([{ id: 'D1' }, { id: 'W1' }]);
    } finally {
      backup.close();
    }
  } finally {
    db.close();
  }
});

test('--waiting-on accepts Chinese and English values, clears, audits and undoes', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '等资料', '--lane', 'waiting', '--waiting-on', '客户');
  expect(task(db, 'T1').waitingOn).toBe('customer');
  for (const [input, stored] of [
    ['前置', 'dependency'],
    ['你', 'user'],
    ['customer', 'customer'],
    ['dependency', 'dependency'],
    ['等客户', 'customer'],
    ['user', 'user'],
  ] as const) {
    write('task', 'update', 'T1', '--waiting-on', input);
    expect(task(db, 'T1').waitingOn).toBe(stored);
  }
  const result = write('task', 'update', 'T1', '--waiting-on', '客户');
  expect(snapshot(db).events[0]!.text).toContain('等谁=等客户');
  write('undo', result.batch);
  expect(task(db, 'T1').waitingOn).toBe('user');
  write('task', 'update', 'T1', '--waiting-on', '');
  expect(task(db, 'T1')).not.toHaveProperty('waitingOn');
  expect(snapshot(db).events[0]!.text).toContain('等谁=清空');
  expect(() => write('task', 'update', 'T1', '--waiting-on', '老板')).toThrow('等谁只能是 你|客户|前置');
  write('task', 'move', 'T1', '--lane', 'waiting', '--waiting-on', '前置');
  expect(task(db, 'T1').waitingOn).toBe('dependency');
});

test('waiting_on clears when a task leaves waiting without needs and is rejected where meaningless', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '甲', '--lane', 'waiting', '--waiting-on', '前置');
  write('task', 'add', 'T2', '--system', 'beidou', '--title', '乙', '--lane', 'waiting', '--waiting-on', '客户');
  write('task', 'update', 'T2', '--needs', '客户给图纸');
  const moved = write('task', 'move', 'T1', '--lane', 'doing');
  expect(task(db, 'T1')).not.toHaveProperty('waitingOn');
  write('task', 'move', 'T2', '--lane', 'doing');
  expect(task(db, 'T2').waitingOn).toBe('customer');
  write('task', 'update', 'T2', '--needs', '');
  expect(task(db, 'T2')).not.toHaveProperty('waitingOn');
  write('undo', moved.batch);
  expect(task(db, 'T1')).toMatchObject({ lane: 'waiting', waitingOn: 'dependency' });
  expect(() => write('task', 'update', 'T2', '--waiting-on', '客户')).toThrow('只用于等待中');
  expect(() => write('task', 'add', 'T3', '--system', 'beidou', '--title', '丙', '--waiting-on', '客户')).toThrow(
    '只用于等待中',
  );
});

test('SQL backup and restore round trip keeps waiting_on', () => {
  const { db, home, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '等资料', '--lane', 'waiting', '--waiting-on', '客户');
  const sql = dump(db),
    file = join(home, 'export.sql');
  expect(sql).toContain("'customer'");
  writeFileSync(file, sql);
  const dest = join(temp(), 'restored.db');
  restore(file, dest);
  const restored = connect(dest);
  try {
    expect(dump(restored)).toBe(sql);
    expect(snapshot(restored).tasks[0]!.waitingOn).toBe('customer');
  } finally {
    restored.close();
  }
});

test('/api/task/move takes an optional waitingOn and rejects bad values in Chinese', async () => {
  const f = setup(),
    headers = await f.page();
  let r = await f.request('/api/task/move', { id: 'T1', lane: 'waiting', waitingOn: 'customer' }, { headers });
  expect(r.code).toBe(200);
  expect(r.json().snapshot.tasks[0]).toMatchObject({ lane: 'waiting', waitingOn: 'customer' });
  r = await f.request('/api/task/move', { id: 'T1', lane: 'waiting', waitingOn: null }, { headers });
  expect(r.json().snapshot.tasks[0]).not.toHaveProperty('waitingOn');
  r = await f.request('/api/task/move', { id: 'T1', lane: 'waiting', waitingOn: '客户' }, { headers });
  expect(r.code).toBe(400);
  expect(r.json().error ?? r.text).toContain('等谁只能是');
  r = await f.request('/api/task/move', { id: 'T1', lane: 'waiting', waitingOn: 3 }, { headers });
  expect(r.code).toBe(400);
  expect(snapshot(f.db).tasks[0]).not.toHaveProperty('waitingOn');
});

test('hook lists only 等你 tasks and counts the three kinds per system', async () => {
  const { home, write } = boot();
  write('task', 'add', 'U1', '--system', 'beidou', '--title', '甲', '--lane', 'waiting');
  write('task', 'add', 'U2', '--system', 'beidou', '--title', '乙', '--lane', 'waiting', '--waiting-on', '你');
  write('task', 'add', 'C1', '--system', 'beidou', '--title', '丙', '--lane', 'waiting', '--waiting-on', '客户');
  write('task', 'add', 'P1', '--system', 'beidou', '--title', '丁', '--lane', 'waiting', '--waiting-on', '前置');
  write('task', 'add', 'P2', '--system', 'beidou', '--title', '戊', '--lane', 'waiting', '--waiting-on', '前置');
  write('task', 'add', 'N1', '--system', 'beidou', '--title', '己', '--lane', 'doing', '--needs', '看一眼');
  const text = await hookText(home);
  expect(text.split('\n').length).toBeLessThanOrEqual(5);
  expect(text).toContain('北斗/北斗：开发中 1，等你 3，等客户 1，等前置 2，等发版 0，完成 0/6');
  const needs = text.split('\n').at(-1)!;
  expect(needs).toMatch(/^需要你：(U1|U2|N1)、(U1|U2|N1)、(U1|U2|N1)（/);
  for (const id of ['C1', 'P1', 'P2']) expect(needs).not.toContain(id);
});

test('hook reads a v2 database without the column, treating every waiting task as 等你', async () => {
  const { home, db } = v2Database();
  try {
    const text = await hookText(home);
    expect(text).toContain('北斗/旧系统：开发中 1，等你 1，等发版 0，完成 0/2');
    expect(text.split('\n').at(-1)).toContain('需要你：W1');
    expect(db.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(2);
  } finally {
    db.close();
  }
});
