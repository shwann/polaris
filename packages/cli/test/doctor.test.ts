import * as fs from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { boot, temp } from './helpers.js';
import { backup } from '../src/export/backup.js';
import { diagnose, runDoctor } from '../src/commands/doctor.js';
import { sessionStart } from '../src/commands/hook.js';
import { readOnly } from '../src/db/readonly.js';
import * as runtime from '../src/runtime.js';
import { inspectPort } from '../src/commands/doctor-port.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, accessSync: vi.fn(actual.accessSync) };
});
vi.mock('../src/commands/doctor-port.js', () => ({
  inspectPort: vi.fn(async () => ({ ok: true, occupied: false, polaris: false, detail: '端口 8790 空闲' })),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});
const byName = (result: Awaited<ReturnType<typeof diagnose>>, name: string) =>
  result.checks.find((c) => c.name === name)!;

test.each([
  ['20.20.0', false],
  ['22.12.0', false],
  ['22.13.0', true],
  ['22.22.3', true],
  ['24.0.0', true],
])('Node runtime boundary %s is %s', (version, expected) => {
  expect(runtime.supportedNode(version)).toBe(expected);
});

test('doctor checks Node, SQLite, writable home, schema/check, git, backup and port without changing data', async () => {
  const { db, home, path } = boot();
  backup(db, home, 'initial');
  const before = fs.readFileSync(path);
  const result = await diagnose(home);
  expect(result.ok).toBe(true);
  expect(result.checks.map((c) => c.name)).toEqual(['node', 'sqlite', 'home', 'database', 'git', 'backup', 'port']);
  expect(byName(result, 'home')).toMatchObject({ path: home, exists: true, writable: true });
  expect(byName(result, 'database')).toMatchObject({ exists: true, migrationVersion: 2, check: { errors: 0 } });
  expect(fs.readFileSync(path)).toEqual(before);
  expect(inspectPort).toHaveBeenCalledWith(8790);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await runDoctor(['--home', home, '--json']);
  expect(JSON.parse(String(log.mock.calls.at(-1)![0])).ok).toBe(true);
  expect(process.exitCode ?? 0).toBe(0);
  await runDoctor(['--home', home]);
  expect(String(log.mock.calls.at(-1)![0])).toContain('✓');
});

test('doctor reports an absent directory/database without creating either', async () => {
  const home = join(temp(), 'not-created');
  const result = await diagnose(home);
  expect(result.ok).toBe(false);
  expect(byName(result, 'home')).toMatchObject({ exists: false, writable: true, ok: false });
  expect(byName(result, 'database')).toMatchObject({ exists: false, migrationVersion: null });
  expect(fs.existsSync(home)).toBe(false);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await runDoctor(['--home', home]);
  expect(process.exitCode).toBe(1);
  expect(String(log.mock.calls[0]![0])).toContain('✗');
});

test('doctor reports unwritable and non-directory homes portably', async () => {
  const home = temp();
  vi.spyOn(fs, 'accessSync').mockImplementation(() => {
    throw new Error('permission denied');
  });
  expect(byName(await diagnose(home), 'home')).toMatchObject({ writable: false, ok: false });
  vi.restoreAllMocks();
  const file = join(home, 'file');
  fs.writeFileSync(file, 'file');
  expect(byName(await diagnose(file), 'home').writable).toBe(false);
});

test('doctor reports missing git/backup via PATH and SQL export still succeeds', async () => {
  const { db, home } = boot();
  vi.stubEnv('PATH', join(home, 'no-executables'));
  const saved = backup(db, home, 'no git');
  expect(saved.warning).toContain('没有 git');
  expect(fs.readFileSync(saved.file, 'utf8')).toContain('CREATE TABLE');
  const result = await diagnose(home);
  expect(byName(result, 'git')).toMatchObject({ available: false, ok: false });
  expect(byName(result, 'backup')).toMatchObject({ exists: false, ok: false });
});

test('doctor reports unavailable runtime and busy port without aborting subsequent checks', async () => {
  const { home } = boot();
  vi.spyOn(runtime, 'supportedNode').mockReturnValue(false);
  vi.spyOn(runtime, 'sqliteAvailable').mockResolvedValue(false);
  vi.mocked(inspectPort).mockResolvedValueOnce({ ok: false, occupied: true, polaris: false, detail: '端口占用' });
  const result = await diagnose(home);
  expect(byName(result, 'node').ok).toBe(false);
  expect(byName(result, 'sqlite').ok).toBe(false);
  expect(byName(result, 'database').ok).toBe(false);
  expect(byName(result, 'port')).toMatchObject({ ok: false, occupied: true, polaris: false });
});

test('doctor rejects corrupt data, unsupported schema and check violations without migration', async () => {
  const bad = temp();
  fs.writeFileSync(join(bad, 'polaris.db'), 'not SQLite');
  expect(byName(await diagnose(bad), 'database').detail).toContain('检查失败');
  const { db, home, write } = boot();
  write('task', 'add', 'BAD', '--system', 'beidou', '--title', '任务');
  db.run('UPDATE schema_version SET version=99 WHERE version=2');
  expect(byName(await diagnose(home), 'database')).toMatchObject({ migrationVersion: 99, ok: false });
  expect(db.get('SELECT MAX(version) AS version FROM schema_version')?.version).toBe(99);
  db.run('UPDATE schema_version SET version=2 WHERE version=99');
  db.run("UPDATE tasks SET updated_at='invalid'");
  expect(byName(await diagnose(home), 'database').ok).toBe(false);
});

test('read-only helper refuses writes and always closes after failure', async () => {
  const { path } = boot();
  await expect(readOnly(path, (db) => db.exec('DELETE FROM systems'))).rejects.toThrow();
  await expect(readOnly(path, (db) => db.run('DELETE FROM systems'))).rejects.toThrow('只读');
  expect(await readOnly(path, (db) => db.all('SELECT * FROM systems'))).toHaveLength(1);
});

test('hook is silent with no database, corrupt database, invalid options or POLARIS_HOOK=off', async () => {
  const home = temp();
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await sessionStart(['--home', home]);
  expect(fs.readdirSync(home)).toEqual([]);
  fs.writeFileSync(join(home, 'polaris.db'), 'bad');
  await sessionStart(['--home', home]);
  await sessionStart(['--unknown']);
  vi.stubEnv('POLARIS_HOOK', 'off');
  await sessionStart(['--home', home]);
  expect(log).not.toHaveBeenCalled();
});

test('hook summarizes all systems and oldest three needed IDs within five lines without business writes', async () => {
  const { db, write, home } = boot();
  for (let i = 1; i <= 4; i++) {
    write('system', 'add', `demo${i}`, '--name', `示例${i}\n系统`);
    write('task', 'add', `WAIT${i}`, '--system', `demo${i}`, '--title', '等待', '--lane', 'waiting');
  }
  write('task', 'add', 'LOGIN', '--system', 'beidou', '--title', '登录', '--lane', 'doing');
  write('task', 'add', 'DONE', '--system', 'beidou', '--title', '完成', '--lane', 'done');
  write('task', 'add', 'REL', '--system', 'beidou', '--title', '发版', '--lane', 'release');
  const before = db.all('SELECT * FROM changes');
  const files = fs.readdirSync(home).sort();
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await sessionStart(['--home', home]);
  const text = String(log.mock.calls[0]![0]);
  expect(text.split('\n').length).toBeLessThanOrEqual(5);
  expect(text).toContain('开发中 1，等你回复 0，等发版 1，完成 1/3');
  for (let i = 1; i <= 4; i++) expect(text).toContain(`示例${i} 系统`);
  expect(text.split('\n').at(-1)).toContain('需要你：WAIT1、WAIT2、WAIT3');
  expect(text.split('\n').at(-1)).not.toContain('WAIT4');
  expect(db.all('SELECT * FROM changes')).toEqual(before);
  expect(fs.readdirSync(home).sort()).toEqual(files);
  expect(fs.existsSync(join(home, 'backup'))).toBe(false);
});
