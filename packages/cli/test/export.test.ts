import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { fromLegacy, validateSnapshot } from '@polaris/core';
import type { LegacyBoard, LegacyLog, LegacyTask } from '@polaris/core';
import { readdirSync } from 'node:fs';
import { boot, fixture, temp } from './helpers.js';
import { readLegacy } from '../src/export/importer.js';
import { snapshot } from '../src/export/snapshot.js';
import { backup, dump, restore } from '../src/export/backup.js';
import { connect } from '../src/db/connection.js';

// Real data is machine-specific: set POLARIS_LEGACY_DATA to a legacy JSON folder to include it; the sample always runs.
const real = process.env.POLARIS_LEGACY_DATA;
const sample = join(import.meta.dirname, '..', '..', '..', 'plugin', 'skills', 'polaris', 'assets', 'sample');

function importMatchesFromLegacy(dir: string) {
  const source = join(temp(), 'copy');
  cpSync(dir, source, { recursive: true });
  const board = JSON.parse(readFileSync(join(source, 'board.json'), 'utf8')) as LegacyBoard;
  const log = JSON.parse(readFileSync(join(source, 'log.json'), 'utf8')) as LegacyLog;
  const tasks = readdirSync(join(source, 'tasks'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ ...JSON.parse(readFileSync(join(source, 'tasks', f), 'utf8')), id: f.slice(0, -5) }) as LegacyTask);
  const expected = fromLegacy({ board, log, tasks }, '2026-11-11T00:00:00Z');
  const { db, write } = fixture();
  write('import-json', source);
  const actual = snapshot(db);
  expect(actual.tasks).toHaveLength(tasks.length);
  expect(actual.systems).toEqual(expected.systems);
  expect(actual.tasks).toEqual(expected.tasks);
  expect(actual.events).toEqual(expected.events);
  expect(validateSnapshot(actual).filter((i) => i.level === 'error')).toEqual([]);
  expect(() => write('import-json', source)).toThrow('空库');
  const system = expected.systems[0]!.key;
  write('release', 'record', '--system', system, '--version', 'cli-test-release-after-import');
  expect(snapshot(db).systems[0]!.releases.at(-1)!.version).toBe('cli-test-release-after-import');
}

test('sample legacy data: import matches fromLegacy', () => importMatchesFromLegacy(sample));

test.skipIf(!real)('real legacy data (POLARIS_LEGACY_DATA): copy first, import matches fromLegacy', () =>
  importMatchesFromLegacy(real!),
);

test('artifact meta/tasks uses the same core conversion', () => {
  const source = temp();
  mkdirSync(join(source, 'meta'));
  mkdirSync(join(source, 'tasks'));
  writeFileSync(join(source, 'meta', 'board.json'), JSON.stringify({ systems: [{ key: 'a', name: '系统' }] }));
  writeFileSync(join(source, 'meta', 'log.json'), JSON.stringify({ items: [] }));
  writeFileSync(
    join(source, 'tasks', 'T1.json'),
    JSON.stringify({
      code: 'T1',
      title: '任务',
      group: 'planned',
      status: '待开工',
      updatedAt: '2026-11-11T00:00:00Z',
    }),
  );
  const { db, write } = fixture();
  write('import-json', source, '--artifact-export');
  expect(snapshot(db).tasks).toEqual(readLegacy(source, true).tasks);
});

test('SQL export and restore round trip is byte-identical including quotes, Unicode, null and NUL', () => {
  const { db, home, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', "客户的 '标题'\n</script>", '--detail', '含\0空字节');
  write(
    'dispatch',
    'set',
    '--engine',
    'codex',
    '--model',
    'gpt-6.1-sol',
    '--effort',
    'xhigh',
    '--note',
    "客户的 '原话'\n含\0字节",
  );
  write('dispatch', 'set', '--engine', 'claude', '--model', 'opus', '--effort', 'max', '--note', '最新原话');
  write('task', 'update', 'T1', '--dispatch', 'claude/opus/medium', '--executor', 'Claude opus｜会话');
  const sql = dump(db),
    file = join(home, 'export.sql');
  writeFileSync(file, sql);
  const dest = join(temp(), 'restored.db');
  restore(file, dest);
  const restored = connect(dest);
  try {
    expect(dump(restored)).toBe(sql);
    expect(restored.all('SELECT * FROM dispatch_settings')).toEqual(db.all('SELECT * FROM dispatch_settings'));
    expect(snapshot(restored).systems[0]!.dispatch!.history).toHaveLength(2);
    expect(snapshot(restored).tasks[0]!.executor).toBe('Claude opus｜会话');
  } finally {
    restored.close();
  }
  const saved = backup(db, home, '测试备份');
  expect(saved.warning).toBeUndefined();
  expect(readFileSync(saved.file, 'utf8')).toBe(sql);
  expect(
    execFileSync('git', ['-C', join(home, 'backup'), 'log', '-1', '--format=%s'], { encoding: 'utf8' }).trim(),
  ).toBe('测试备份');
});

test('restore retains old database and rejects malformed or invalid backups before replacement', () => {
  const { db, home, write } = boot();
  write('task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  const file = join(home, 'valid.sql');
  writeFileSync(file, dump(db));
  const path = join(temp(), 'polaris.db');
  restore(file, path);
  const result = restore(file, path);
  expect(existsSync(result.retained!)).toBe(true);
  const before = readFileSync(path);
  const bad = join(home, 'bad.sql');
  writeFileSync(bad, 'NOT SQL;');
  expect(() => restore(bad, path)).toThrow();
  expect(readFileSync(path)).toEqual(before);
});

test('backup still exports SQL when git is unavailable', () => {
  const { db, home } = boot(),
    old = process.env.PATH;
  try {
    process.env.PATH = join(home, 'no-executables');
    const result = backup(db, home, '无 git');
    expect(result.warning).toContain('本机没有 git');
    expect(readFileSync(result.file, 'utf8')).toBe(dump(db));
  } finally {
    if (old === undefined) delete process.env.PATH;
    else process.env.PATH = old;
  }
});

test('restore can replace a corrupt old database while retaining its original bytes', () => {
  const { db, home } = boot(),
    sql = join(home, 'good.sql'),
    path = join(temp(), 'broken.db');
  writeFileSync(sql, dump(db));
  writeFileSync(path, 'not a database');
  const result = restore(sql, path);
  expect(readFileSync(result.retained!, 'utf8')).toBe('not a database');
  const restored = connect(path);
  try {
    expect(restored.get('PRAGMA integrity_check')!.integrity_check).toBe('ok');
  } finally {
    restored.close();
  }
});
