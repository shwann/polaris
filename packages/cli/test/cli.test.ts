import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import { config } from '../src/config.js';
import { connect } from '../src/db/connection.js';
import { temp } from './helpers.js';

const binary = resolve('plugin/bin/polaris.mjs');
beforeAll(() => {
  execFileSync(process.execPath, [resolve('packages/cli/scripts/bundle.mjs')], {
    env: { ...process.env },
    stdio: 'pipe',
  });
});
function cli(home: string, ...args: string[]) {
  return execFileSync(process.execPath, [binary, ...args, '--home', home, '--json'], { encoding: 'utf8' });
}

test.each([
  { sandbox: '', json: false },
  { sandbox: '', json: true },
  { sandbox: 'seatbelt', json: false },
  { sandbox: 'seatbelt', json: true },
])('database open failures report Codex advice only inside its sandbox: %j', ({ sandbox, json }) => {
  const home = temp();
  mkdirSync(join(home, 'polaris.db'));
  const env = { ...process.env, CODEX_SANDBOX: sandbox };
  const args = [binary, '--home', home, 'system', 'list', ...(json ? ['--json'] : [])];
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  const error = json ? JSON.parse(result.stderr).error : result.stderr;
  expect(error).toContain('无法打开数据库');
  expect(error).toContain('unable to open database file');
  expect(error.includes('当前在 Codex 沙箱中')).toBe(Boolean(sandbox));
  if (sandbox) {
    expect(error).toContain('[sandbox_workspace_write]');
    expect(error).toContain(`writable_roots 加上 ${JSON.stringify(home)}`);
    expect(error).toContain('POLARIS_HOME 指到工作区内');
  }
  const invalid = spawnSync(process.execPath, [binary, '--home', home, 'invalid', '--json'], {
    env,
    encoding: 'utf8',
  });
  expect(JSON.parse(invalid.stderr).error).toContain('未知命令');
  expect(invalid.stderr).not.toContain('当前在 Codex 沙箱中');
});

test('Codex advice also covers failure to create the database directory', () => {
  const home = join(temp(), 'blocked');
  writeFileSync(home, 'not a directory');
  const result = spawnSync(process.execPath, [binary, '--home', home, 'system', 'list', '--json'], {
    env: { ...process.env, CODEX_SANDBOX: 'seatbelt' },
    encoding: 'utf8',
  });
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stderr).error).toContain(`writable_roots 加上 ${JSON.stringify(home)}`);
});

test('bundle runs help and status on a temporary home, bundles SQL/core and suppresses only SQLite warnings', () => {
  const home = temp();
  expect(readFileSync(binary, 'utf8').startsWith('#!/usr/bin/env node\n')).toBe(true);
  expect(JSON.parse(cli(home, '--help')).help).toContain('北辰');
  expect(JSON.parse(cli(home, 'status'))).toMatchObject({ total: 0, completion: 0 });
  const child = spawn(process.execPath, [binary, 'status', '--home', home, '--json']);
  let stderr = '';
  child.stderr.on('data', (v: Buffer) => {
    stderr += v.toString();
  });
  return new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      try {
        expect(code).toBe(0);
        expect(stderr).not.toContain('ExperimentalWarning');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});

test('config precedence, actor fallback and ancestor .polaris.json work without accessing a default home', () => {
  const home = temp(),
    cwd = join(home, 'repo', 'nested');
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(home, 'repo', '.polaris.json'), '{"system":"beidou"}');
  const originalHome = process.env.POLARIS_HOME,
    originalActor = process.env.POLARIS_ACTOR;
  try {
    process.env.POLARIS_HOME = join(home, 'env');
    process.env.POLARIS_ACTOR = 'env-actor';
    expect(config({ home: join(home, 'explicit'), actor: 'explicit' }, cwd)).toMatchObject({
      home: join(home, 'explicit'),
      actor: 'explicit',
      system: 'beidou',
    });
    expect(config({}, cwd)).toMatchObject({ home: join(home, 'env'), actor: 'env-actor' });
    delete process.env.POLARIS_HOME;
    delete process.env.POLARIS_ACTOR;
    expect(config({ home }, cwd).actor).toBe('user');
  } finally {
    if (originalHome === undefined) delete process.env.POLARIS_HOME;
    else process.env.POLARIS_HOME = originalHome;
    if (originalActor === undefined) delete process.env.POLARIS_ACTOR;
    else process.env.POLARIS_ACTOR = originalActor;
  }
});

test('public CLI covers requirement/task/release/log/check/undo/backup/restore and JSON errors', () => {
  const home = temp();
  cli(home, 'system', 'add', 'beidou', '--name', '测试');
  cli(home, 'system', 'update', 'beidou', '--name', '北斗');
  expect(JSON.parse(cli(home, 'system', 'list'))[0].name).toBe('北斗');
  cli(home, 'req', 'add', 'R1', '--system', 'beidou', '--title', '需求', '--accept', '验收一', '--accept', '验收二');
  cli(home, 'task', 'add', 'T1', '--system', 'beidou', '--title', '任务');
  cli(home, 'task', 'link', 'T1', '--req', 'R1');
  expect(JSON.parse(cli(home, 'req', 'show', 'R1')).taskIds).toEqual(['T1']);
  cli(home, 'task', 'step', 'T1', '--seq', '1', '--name', '开发', '--state', 'done');
  cli(home, 'release', 'record', '--system', 'beidou', '--version', '1.0', '--tasks', 'T1');
  expect(JSON.parse(cli(home, 'task', 'show', 'T1')).shippedIn).toBe('1.0');
  const log = JSON.parse(cli(home, 'log', 'add', '--text', '手写动态'));
  cli(home, 'undo', log.batch);
  expect(JSON.parse(cli(home, 'check')).errors).toBe(0);
  const file = JSON.parse(cli(home, 'backup')).file;
  cli(home, 'restore', file);
  expect(JSON.parse(cli(home, 'task', 'list'))).toHaveLength(1);
  try {
    cli(home, 'task', 'move', 'T1', '--lane', 'invalid');
    throw new Error('must fail');
  } catch (error) {
    expect(String((error as { stderr?: string }).stderr)).toContain('error');
  }
});

test('two subprocesses each write 50 tasks with automatic SQL/git backups; no lost writes or corruption', async () => {
  const home = temp();
  cli(home, 'system', 'add', 'beidou');
  const worker = join(temp(), 'writer.mjs');
  writeFileSync(
    worker,
    `import {execFileSync} from 'node:child_process';
const [binary,home,prefix]=process.argv.slice(2);
for(let i=0;i<50;i++)execFileSync(process.execPath,[binary,'task','add',prefix+i,'--system','beidou','--title',prefix+i,'--home',home,'--json'],{stdio:'pipe'});`,
  );
  const start = (prefix: string) =>
    new Promise<void>((resolve, reject) => {
      const p = spawn(process.execPath, [worker, binary, home, prefix], { stdio: ['ignore', 'pipe', 'pipe'] });
      let error = '';
      p.stderr.on('data', (v: Buffer) => {
        error += v.toString();
      });
      p.on('error', reject);
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(error))));
    });
  await Promise.all([start('A'), start('B')]);
  const db = connect(join(home, 'polaris.db'));
  try {
    expect(db.get('SELECT count(*) AS n FROM tasks')!.n).toBe(100);
    expect(db.get('SELECT count(*) AS n FROM events')!.n).toBe(101);
    expect(db.get('SELECT count(DISTINCT batch) AS n FROM changes')!.n).toBe(101);
    expect(db.get('PRAGMA integrity_check')!.integrity_check).toBe('ok');
    expect(db.all('PRAGMA foreign_key_check')).toEqual([]);
    expect(
      execFileSync('git', ['-C', join(home, 'backup'), 'rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim(),
    ).toBe('101');
    expect(readFileSync(join(home, 'backup', 'polaris.sql'), 'utf8').match(/INSERT INTO "tasks"/g)).toHaveLength(100);
  } finally {
    db.close();
  }
}, 60000);

test('unsupported Node gives Chinese guidance before loading SQLite; unrelated warnings remain visible', () => {
  const dir = temp(),
    version = join(dir, 'old-node.mjs'),
    warnings = join(dir, 'warning.mjs');
  writeFileSync(version, "Object.defineProperty(process.versions,'node',{value:'22.12.0'});");
  try {
    execFileSync(process.execPath, ['--import', version, binary, '--help', '--home', dir], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    throw new Error('must reject');
  } catch (error) {
    expect(String((error as { stderr?: string }).stderr)).toContain('需要 Node 22.13');
  }
  writeFileSync(warnings, "setTimeout(()=>process.emitWarning('Unrelated feature',{type:'ExperimentalWarning'}),50);");
  return new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, ['--import', warnings, binary, 'status', '--home', dir, '--json']);
    let stderr = '';
    p.stderr.on('data', (v: Buffer) => {
      stderr += v.toString();
    });
    p.on('error', reject);
    p.on('exit', (code) => {
      try {
        expect(code).toBe(0);
        expect(stderr).toContain('Unrelated feature');
        expect(stderr).not.toContain('SQLite is an experimental');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});

test('SQLite disabled fails before command loading, while doctor reports it and hooks stay silent', () => {
  const home = temp();
  const run = (...args: string[]) => {
    try {
      return {
        stdout: execFileSync(process.execPath, ['--no-experimental-sqlite', binary, ...args, '--home', home], {
          encoding: 'utf8',
          stdio: 'pipe',
        }),
        stderr: '',
        status: 0,
      };
    } catch (error) {
      return error as { stdout: string; stderr: string; status: number };
    }
  };
  const result = run('status');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(`当前 Node ${process.versions.node}`);
  expect(result.stderr).toContain('https://nodejs.org');
  expect(result.stderr.trim().split('\n')).toHaveLength(1);
  expect(result.stderr).not.toContain(' at ');
  const doctor = run('doctor', '--json');
  expect(doctor.status).toBe(1);
  expect(JSON.parse(doctor.stdout).checks.find((c: { name: string }) => c.name === 'sqlite').ok).toBe(false);
  const hook = run('hook', 'session-start');
  expect(hook).toMatchObject({ status: 0, stdout: '', stderr: '' });
});

test('bundled hooks ignore absent/corrupt databases and disabled or unsupported runtimes', () => {
  const home = temp();
  const run = (prefix: string[] = [], env = process.env) =>
    execFileSync(process.execPath, [...prefix, binary, 'hook', 'session-start', '--home', home], {
      encoding: 'utf8',
      stdio: 'pipe',
      env,
    });
  expect(run()).toBe('');
  writeFileSync(join(home, 'polaris.db'), 'corrupt');
  expect(run()).toBe('');
  expect(run([], { ...process.env, POLARIS_HOOK: 'off' })).toBe('');
  const preload = join(home, 'old.mjs');
  writeFileSync(preload, "Object.defineProperty(process.versions,'node',{value:'20.0.0'});");
  expect(run(['--import', preload])).toBe('');
});

test('req check checks and unchecks a single criterion through the CLI and exposes help', () => {
  const home = temp();
  cli(home, 'system', 'add', 'beidou');
  cli(home, 'req', 'add', 'R1', '--system', 'beidou', '--title', '验收', '--accept', '一', '--accept', '二');
  const checked = JSON.parse(cli(home, 'req', 'check', 'R1', '--item', '2'));
  expect(JSON.parse(cli(home, 'req', 'show', 'R1')).acceptance).toEqual([
    { text: '一', met: false },
    { text: '二', met: true },
  ]);
  cli(home, 'undo', checked.batch);
  expect(JSON.parse(cli(home, 'req', 'show', 'R1')).acceptance[1].met).toBe(false);
  cli(home, 'req', 'check', 'R1', '--item', '1');
  cli(home, 'req', 'check', 'R1', '--item', '1', '--off');
  expect(JSON.parse(cli(home, 'req', 'show', 'R1')).acceptance.every((i: { met: boolean }) => !i.met)).toBe(true);
  expect(cli(home, '--help')).toContain('req check');
});

test('dispatch CLI errors exit nonzero in Chinese and plain output remains one line', () => {
  const home = temp();
  expect(() => cli(home, 'dispatch', 'show')).toThrow();
  try {
    cli(home, 'dispatch', 'show');
  } catch (error) {
    expect(String((error as { stderr?: string }).stderr)).toContain('尚未设置派工');
  }
  cli(home, 'system', 'add', 'beidou', '--name', '测试');
  cli(
    home,
    'dispatch',
    'set',
    '--engine',
    'codex',
    '--model',
    'gpt-6.1-sol',
    '--effort',
    'xhigh',
    '--note',
    '原话\n示例',
  );
  const result = JSON.parse(cli(home, 'dispatch', 'show'));
  expect(result).toMatchObject({ system: 'beidou', engine: 'codex', source: 'system', by: '用户' });
  const plain = execFileSync(process.execPath, [binary, 'dispatch', 'show', '--home', home], { encoding: 'utf8' });
  expect(plain.trim().split('\n')).toHaveLength(1);
  expect(plain).toContain('派工：Codex gpt-6.1-sol / xhigh');
});

test('bundled hook accepts leading global options and remains silent when disabled', () => {
  const home = temp();
  cli(home, 'system', 'add', 'beidou', '--name', '测试');
  cli(home, 'dispatch', 'set', '--engine', 'codex', '--model', 'gpt-6.1-sol', '--effort', 'xhigh', '--note', '原话');
  const args = [binary, '--home', home, '--actor', 'test', 'hook', 'session-start'];
  const result = execFileSync(process.execPath, args, { encoding: 'utf8' });
  expect(result).toContain('派工：Codex gpt-6.1-sol / xhigh');
  expect(result.trim().split('\n').length).toBeLessThanOrEqual(5);
  expect(execFileSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, POLARIS_HOOK: 'off' } })).toBe(
    '',
  );
});
