import { existsSync, readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { connect } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { join } from 'node:path';
import { boot, count, fixture, temp } from './helpers.js';
import { snapshot } from '../src/export/snapshot.js';

test('migrations initialize once without empty backups and configure the connection', () => {
  const { db, path, home } = fixture();
  expect(db.all("SELECT name FROM sqlite_master WHERE type='table'")).toHaveLength(13);
  expect(db.all('SELECT version FROM schema_version')).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
  migrate(db, path);
  expect(db.all('SELECT version FROM schema_version')).toHaveLength(3);
  expect(readdirSync(home).filter((p) => p.includes('.before-migration-'))).toEqual([]);
  expect(existsSync(path)).toBe(true);
  expect(db.get('PRAGMA foreign_keys')!.foreign_keys).toBe(1);
  expect(db.get('PRAGMA busy_timeout')!.timeout).toBe(5000);
  expect(db.get('PRAGMA journal_mode')!.journal_mode).toBe('wal');
  const other = connect(path);
  other.close();
});

test('invalid lane, priority, progress and foreign keys roll back business rows and all audit rows', () => {
  const { db, write } = boot();
  const before = { tasks: count(db, 'tasks'), events: count(db, 'events'), changes: count(db, 'changes') };
  for (const args of [
    ['task', 'add', 'BAD', '--system', 'beidou', '--title', '坏', '--lane', 'bad'],
    ['task', 'add', 'BAD', '--system', 'missing', '--title', '坏'],
    ['task', 'add', 'BAD', '--system', 'beidou', '--title', '坏', '--progress', '101'],
    ['req', 'add', 'R1', '--system', 'beidou', '--title', '坏', '--priority', 'P9'],
  ]) {
    expect(() => write(...args)).toThrow();
    expect({ tasks: count(db, 'tasks'), events: count(db, 'events'), changes: count(db, 'changes') }).toEqual(before);
    expect(snapshot(db).requirements).toHaveLength(0);
  }
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  const changes = count(db, 'changes'),
    events = count(db, 'events');
  expect(() => write('task', 'link', 'T1', '--req', 'MISSING')).toThrow();
  expect(count(db, 'changes')).toBe(changes);
  expect(count(db, 'events')).toBe(events);
  expect(db.all('PRAGMA foreign_key_check')).toEqual([]);
});

test('field audit records actor and old/new values; undo restores all original fields', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '旧标题');
  const original = snapshot(db).tasks[0];
  const result = write('task', 'update', 'T1', '--title', '新标题', '--progress', '50');
  const changes = db.all(
    'SELECT field,old,new,actor FROM changes WHERE batch=? AND entity=? ORDER BY field',
    result.batch,
    'tasks',
  );
  expect(changes.map((c) => c.field)).toEqual(['progress', 'title', 'updated_at']);
  expect(changes.find((c) => c.field === 'title')).toMatchObject({ old: '"旧标题"', new: '"新标题"', actor: 'test' });
  write('undo', result.batch);
  expect(snapshot(db).tasks[0]).toEqual(original);
  expect(snapshot(db).events[0]!.text).toContain('撤销');
});

test('undo rejects conflicting later edits without leaving partial changes', () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '原值');
  const first = write('task', 'update', 'T1', '--title', '第一次');
  write('task', 'update', 'T1', '--title', '第二次');
  const before = count(db, 'changes');
  expect(() => write('undo', first.batch)).toThrow('后续命令');
  expect(count(db, 'changes')).toBe(before);
  expect(snapshot(db).tasks[0]!.title).toBe('第二次');
});

test('core pre/post validation rolls back the entire command, including an already-inserted event', async () => {
  const { db, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  const { write: auditedWrite } = await import('../src/service/context.js');
  const { config } = await import('../src/config.js');
  const before = { changes: count(db, 'changes'), events: count(db, 'events') };
  const ctx = { db, config: config({ home: temp() }), at: '2026-11-11T00:00:00Z' };
  expect(() =>
    auditedWrite(ctx, '无效时间', () => db.run("UPDATE tasks SET updated_at='invalid' WHERE id='T1'")),
  ).toThrow('ISO');
  expect({ changes: count(db, 'changes'), events: count(db, 'events') }).toEqual(before);
  expect(snapshot(db).tasks[0]!.updatedAt).not.toBe('invalid');
  db.run("UPDATE tasks SET updated_at='invalid' WHERE id='T1'");
  expect(() => write('log', 'add', '--text', '应拒绝')).toThrow('ISO');
  expect({ changes: count(db, 'changes'), events: count(db, 'events') }).toEqual(before);
});

test('migrations still preserve existing tables and data in a database plus WAL backup', () => {
  const home = temp(),
    path = join(home, 'existing.db'),
    db = connect(path, false);
  try {
    db.exec("CREATE TABLE marker (value TEXT); INSERT INTO marker VALUES ('before migration');");
    migrate(db, path);
    const backups = readdirSync(home).filter((p) => p.includes('.before-migration-'));
    const main = backups.find((p) => !p.endsWith('-wal'))!;
    expect(main).toBeTruthy();
    expect(backups).toContain(main + '-wal');
    const restored = connect(join(home, main), false);
    try {
      expect(restored.get('SELECT value FROM marker')?.value).toBe('before migration');
      expect(restored.get("SELECT name FROM sqlite_master WHERE name='schema_version'")).toBeUndefined();
    } finally {
      restored.close();
    }
    expect(db.get('SELECT value FROM marker')?.value).toBe('before migration');
  } finally {
    db.close();
  }
});
