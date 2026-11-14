import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import { boot, temp } from './helpers.js';
import { connect } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { snapshot } from '../src/export/snapshot.js';
import init from '../src/db/migrations/0001_init.sql?raw';
import dispatch from '../src/db/migrations/0002_dispatch.sql?raw';
import waiting from '../src/db/migrations/0003_waiting_on.sql?raw';

const binary = resolve('plugin/bin/polaris.mjs');
beforeAll(() => {
  execFileSync(process.execPath, [resolve('packages/cli/scripts/bundle.mjs')]);
});
const cli = (home: string, ...args: string[]) =>
  JSON.parse(
    execFileSync(process.execPath, [binary, '--home', home, '--actor', 'test', '--json', ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    }),
  );

test('v3 migration backs up a recoverable database and WAL, preserves old rows, and enforces tags', () => {
  const home = temp(),
    path = join(home, 'polaris.db'),
    db = connect(path, false);
  try {
    db.exec(init + dispatch + waiting);
    db.exec(
      "INSERT INTO schema_version VALUES (3,'2026-11-01T00:00:00Z'); INSERT INTO systems VALUES ('s','北斗','旧系统',NULL,0); INSERT INTO releases VALUES ('r','s','.38','2026-11-01T00:00:00Z','docs/old.md','旧说明');",
    );
    const old = db.all('SELECT * FROM releases');
    migrate(db, path);
    expect(db.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(4);
    expect(db.all('SELECT * FROM releases')).toEqual(old.map((r) => ({ ...r, title: null, tag: null, build: null })));
    const file = readdirSync(home).find((p) => p.includes('.before-migration-') && !p.endsWith('-wal'))!;
    expect(file).toBeTruthy();
    expect(readdirSync(home)).toContain(file + '-wal');
    const saved = connect(join(home, file), false);
    try {
      expect(saved.all('SELECT * FROM releases')).toEqual(old);
      expect(saved.get('SELECT MAX(version) AS v FROM schema_version')!.v).toBe(3);
    } finally {
      saved.close();
    }
    expect(() => db.run("UPDATE releases SET tag='invalid'")).toThrow(/CHECK/);
  } finally {
    db.close();
  }
});

test.each([
  ['功能', 'feature'],
  ['修复', 'fix'],
  ['热修', 'hotfix'],
  ['里程碑', 'milestone'],
  ['feature', 'feature'],
  ['fix', 'fix'],
  ['hotfix', 'hotfix'],
  ['milestone', 'milestone'],
])('record accepts tag %s and keeps app build semantics', (tag, stored) => {
  const { db, write } = boot();
  write(
    'release',
    'record',
    '--system',
    'beidou',
    '--version',
    '.39',
    '--title',
    '本次简介',
    '--tag',
    tag,
    '--build',
    'B39',
  );
  expect(snapshot(db).systems[0]!.releases[0]).toMatchObject({
    title: '本次简介',
    tag: stored,
    build: 'B39',
    items: [],
    stats: { items: 0, features: 0, fixes: 0, unverified: 0 },
  });
  expect(snapshot(db).systems[0]!.app).toMatchObject({ version: '.39', build: 'B39' });
});

test('snapshot orders by release time and derives scoped items, kinds, unverified and rollback', () => {
  const { db, write } = boot();
  write('system', 'add', 'other');
  for (const [id, code, system] of [
    ['a', 'FIX-1', 'beidou'],
    ['b', 'HOTFIX-2', 'beidou'],
    ['c', 'BUG-3', 'beidou'],
    ['d', 'FEAT-4', 'beidou'],
    ['e', 'BUG-5', 'other'],
  ]) {
    write(
      'task',
      'add',
      id!,
      '--system',
      system!,
      '--code',
      code!,
      '--title',
      code!,
      '--shipped-in',
      '.39',
      '--unverified',
      id === 'a' ? '待客户实证' : '',
    );
  }
  write('release', 'record', '--system', 'beidou', '--version', '.39', '--released-at', '2026-11-13T00:00:00Z');
  write('release', 'record', '--system', 'beidou', '--version', '.36', '--released-at', '2026-11-10T00:00:00Z');
  const releases = snapshot(db).systems.find((s) => s.key === 'beidou')!.releases;
  expect(releases.map((r) => r.version)).toEqual(['.36', '.39']);
  expect(releases[1]!.items!.map((i) => i.kind)).toEqual(['fix', 'fix', 'fix', 'feature']);
  expect(releases[1]!.stats).toEqual({ items: 4, features: 1, fixes: 3, unverified: 1, rollback: '.36' });
});

test('edit fields and delivery membership use audit, activity, undo and SQL backup/restore round trips', () => {
  const home = temp();
  cli(home, 'system', 'add', 's');
  for (const id of ['a', 'b', 'c']) cli(home, 'task', 'add', id, '--system', 's', '--title', id);
  cli(home, 'release', 'record', '--system', 's', '--version', '.38', '--tasks', 'c');
  cli(home, 'release', 'record', '--system', 's', '--version', '.39', '--tasks', 'a', '--build', 'original');
  const before = cli(home, 'system', 'list');
  const result = cli(
    home,
    'release',
    'edit',
    '--system',
    's',
    '--version',
    '.39',
    '--title',
    '新版简介',
    '--tag',
    '热修',
    '--build',
    'B39',
    '--note',
    '补录说明',
    '--ref',
    'docs/release.md',
    '--add-tasks',
    'b',
    '--remove-tasks',
    'a,c',
  );
  const after = cli(home, 'system', 'list');
  expect(after[0].app).toEqual(before[0].app);
  expect(after[0].releases[1]).toMatchObject({
    title: '新版简介',
    tag: 'hotfix',
    build: 'B39',
    note: '补录说明',
    ref: 'docs/release.md',
    items: [{ id: 'b' }],
  });
  expect(cli(home, 'task', 'show', 'a').shippedIn).toBeUndefined();
  expect(cli(home, 'task', 'show', 'c').shippedIn).toBe('.38');
  const db = connect(join(home, 'polaris.db'));
  try {
    expect(db.all('SELECT DISTINCT entity FROM changes WHERE batch=? ORDER BY entity', result.batch)).toEqual([
      { entity: 'events' },
      { entity: 'releases' },
      { entity: 'tasks' },
    ]);
    expect(db.get('SELECT text FROM events ORDER BY id DESC LIMIT 1')!.text).toContain('编辑系统 s 发版 .39');
  } finally {
    db.close();
  }
  const sql = readFileSync(result.backup.file, 'utf8');
  expect(sql).toContain('新版简介');
  cli(home, 'undo', result.batch);
  expect(cli(home, 'system', 'list')).toEqual(before);
  // Save the edited SQL before undo replaces the rolling backup.
  const saved = join(home, 'edited.sql');
  writeFileSync(saved, sql);
  cli(home, 'restore', saved);
  expect(cli(home, 'system', 'list')).toEqual(after);
  const cleared = cli(
    home,
    'release',
    'edit',
    '--system',
    's',
    '--version',
    '.39',
    '--title',
    '',
    '--tag',
    '',
    '--build',
    '',
    '--note',
    '',
    '--ref',
    '',
  );
  expect(cli(home, 'system', 'list')[0].releases[1]).not.toHaveProperty('tag');
  cli(home, 'undo', cleared.batch);
  expect(cli(home, 'system', 'list')).toEqual(after);
  expect(cli(home, '--help').help).toContain('release edit');
});

test('invalid edits are atomic and report Chinese version/tag errors', () => {
  const { db, write } = boot();
  write('release', 'record', '--system', 'beidou', '--version', '.39');
  const before = snapshot(db);
  expect(() => write('release', 'edit', '--system', 'beidou', '--version', '.40', '--title', '不存在')).toThrow(
    '版本不存在',
  );
  for (const action of ['edit', 'record'])
    expect(() =>
      write('release', action, '--system', 'beidou', '--version', action === 'edit' ? '.39' : '.40', '--tag', '坏标签'),
    ).toThrow('tag 非法');
  expect(() =>
    write('release', 'edit', '--system', 'beidou', '--version', '.39', '--title', '不可写', '--add-tasks', 'missing'),
  ).toThrow();
  expect(snapshot(db, before.generatedAt)).toEqual(before);
});
