import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { boot, temp } from './helpers.js';
import { showDispatch } from '../src/service/dispatch.js';
import { snapshot } from '../src/export/snapshot.js';
import { connect } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { readOnly } from '../src/db/readonly.js';
import { run } from '../src/commands/run.js';
import { sessionStart } from '../src/commands/hook.js';
import init from '../src/db/migrations/0001_init.sql?raw';

const setting = ['--engine', 'codex', '--model', 'gpt-6.1-sol', '--effort', 'xhigh', '--note', '原话示例'];
afterEach(() => vi.restoreAllMocks());

function oldDatabase() {
  const home = temp(),
    path = join(home, 'polaris.db'),
    db = connect(path, false);
  db.exec(init);
  db.run('INSERT INTO schema_version VALUES (1,?)', '2026-11-11T00:00:00Z');
  db.run("INSERT INTO systems(key,constellation,name) VALUES ('beidou','北斗','旧系统')");
  db.run(`INSERT INTO tasks(id,system_key,code,title,lane,status,updated_at)
    VALUES ('OLD','beidou','OLD','旧任务','doing','开发中','2026-11-11T00:00:00Z')`);
  return { home, path, db };
}

test('v1 upgrades to the latest version with a recoverable pre-migration backup and intact old tasks', () => {
  const { home, path, db } = oldDatabase();
  try {
    migrate(db, path);
    expect(db.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(4);
    expect(snapshot(db).tasks[0]).toMatchObject({ id: 'OLD', title: '旧任务', lane: 'doing' });
    const main = readdirSync(home).find((p) => p.includes('.before-migration-') && !p.endsWith('-wal'))!;
    expect(existsSync(join(home, main))).toBe(true);
    expect(existsSync(join(home, main + '-wal'))).toBe(true);
    const backup = connect(join(home, main), false);
    try {
      expect(backup.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(1);
      expect(backup.get('SELECT title FROM tasks')!.title).toBe('旧任务');
      expect(backup.get('PRAGMA integrity_check')!.integrity_check).toBe('ok');
    } finally {
      backup.close();
    }
  } finally {
    db.close();
  }
});

test('show is read-only on current and v1 databases and does not create a missing home', async () => {
  const { db, write, home, path } = boot();
  write('dispatch', 'set', ...setting);
  const before = db.all('SELECT * FROM changes'),
    files = readdirSync(home).sort();
  const bytes = readFileSync(path);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await run(['dispatch', 'show', '--home', home, '--json']);
  expect(db.all('SELECT * FROM changes')).toEqual(before);
  expect(readdirSync(home).sort()).toEqual(files);
  expect(readFileSync(path)).toEqual(bytes);
  const old = oldDatabase();
  try {
    await expect(run(['dispatch', 'show', '--home', old.home])).rejects.toThrow('尚未设置派工');
    expect(old.db.all('SELECT version FROM schema_version')).toEqual([{ version: 1 }]);
    expect(readdirSync(old.home).some((p) => p.includes('before-migration'))).toBe(false);
    expect((await readOnly(old.path, snapshot)).systems[0]!.dispatch).toBeUndefined();
  } finally {
    old.db.close();
  }
  const missing = join(temp(), 'absent');
  await expect(run(['dispatch', 'show', '--home', missing])).rejects.toThrow('尚未设置派工');
  expect(existsSync(missing)).toBe(false);
  expect(() => showDispatch(db, undefined, 'MISSING')).toThrow('找不到任务');
});

test('v1 hook retains the summary without migrating or losing it when dispatch is unavailable', async () => {
  const { home, db } = oldDatabase();
  try {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sessionStart(['--home', home]);
    expect(log.mock.calls[0]![0]).toContain('北斗/旧系统：开发中 1');
    expect(log.mock.calls[0]![0]).not.toContain('派工：');
    expect(String(log.mock.calls[0]![0]).split('\n').length).toBeLessThanOrEqual(5);
    expect(db.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(1);
  } finally {
    db.close();
  }
});
