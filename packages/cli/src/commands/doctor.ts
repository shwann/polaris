import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { dataHome } from '../config.js';
import { readOnly } from '../db/readonly.js';
import { runtimeAdvice, sqliteAvailable, supportedNode } from '../runtime.js';
import { parse, string } from './args.js';
import { inspectPort } from './doctor-port.js';

interface Result {
  name: string;
  ok: boolean;
  detail: string;
  advice?: string;
  [key: string]: unknown;
}
const failure = (error: unknown) => (error instanceof Error ? error.message : String(error));
export async function diagnose(home: string, port = 8790) {
  const checks: Result[] = [];
  const sqlite = await sqliteAvailable();
  checks.push({ name: 'node', ok: supportedNode(), detail: `Node ${process.versions.node}`, advice: runtimeAdvice() });
  checks.push({
    name: 'sqlite',
    ok: sqlite,
    detail: `node:sqlite ${sqlite ? '可用' : '不可用'}`,
    advice: runtimeAdvice(),
  });
  const exists = existsSync(home);
  let writable = false;
  try {
    let parent = home;
    while (!existsSync(parent) && dirname(parent) !== parent) parent = dirname(parent);
    if (!statSync(parent).isDirectory()) throw new Error('路径不是目录');
    accessSync(parent, constants.W_OK);
    writable = true;
  } catch {
    /* Report an inaccessible directory without modifying it. */
  }
  checks.push({
    name: 'home',
    ok: exists && writable,
    path: home,
    exists,
    writable,
    detail: `数据目录 ${home}（${exists ? '存在' : '不存在'}，${writable ? '可写' : '不可写'}）`,
    advice: '首次使用请让 Claude 新建系统；不可写时用 POLARIS_HOME 指定可写目录',
  });
  const path = join(home, 'polaris.db');
  const databaseExists = existsSync(path);
  let database: Result = {
    name: 'database',
    ok: false,
    path,
    exists: databaseExists,
    migrationVersion: null,
    detail: databaseExists ? '数据库尚未检查' : '数据库不存在',
    advice: '首次使用请让 Claude 新建系统；已有数据请先备份，再运行 check 或更新插件',
  };
  if (databaseExists && sqlite) {
    try {
      database = await readOnly(path, (db) => {
        const version = Number(db.get('SELECT MAX(version) AS version FROM schema_version')?.version ?? 0);
        // Loading check after the SQLite probe keeps doctor usable on unsupported runtimes.
        return { ...database, migrationVersion: version };
      });
      const { check } = await import('./check.js');
      const result = await readOnly(path, (db) => check(db));
      database = {
        ...database,
        ok: [1, 2].includes(Number(database.migrationVersion)) && result.errors === 0,
        check: result,
        detail: `数据库存在，迁移版本 ${database.migrationVersion}，check：${result.errors} 个错误、${result.warnings} 个提示`,
      };
    } catch (error) {
      database.detail = `数据库检查失败：${failure(error)}`;
    }
  } else if (databaseExists) database.detail = '数据库存在，node:sqlite 不可用，无法检查';
  checks.push(database);
  const git = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1500 });
  let gitAvailable = false;
  try {
    git('--version');
    gitAvailable = true;
  } catch {
    /* git is optional for SQL exports. */
  }
  checks.push({
    name: 'git',
    ok: gitAvailable,
    available: gitAvailable,
    detail: gitAvailable ? 'git 可用' : 'git 不可用，SQL 仍会导出但不提交',
    advice: '需要备份提交历史时请安装 git：https://git-scm.com',
  });
  const backup = join(home, 'backup');
  const repositoryExists = existsSync(join(backup, '.git'));
  let repository = false;
  try {
    repository = repositoryExists && git('-C', backup, 'rev-parse', '--show-toplevel').trim().length > 0;
  } catch {
    /* Missing or invalid repositories are reported below. */
  }
  checks.push({
    name: 'backup',
    ok: repository,
    path: backup,
    exists: repositoryExists,
    detail: `备份仓库${repository ? '存在' : repositoryExists ? '存在但不可用' : '不存在'}：${backup}`,
    advice: '安装 git 后运行 backup，自动导出 SQL 并初始化备份仓库',
  });
  checks.push({
    name: 'port',
    ...(await inspectPort(port)),
    advice: '请检查本机网络权限；若端口被占用，用 serve --port 8791',
  });
  return { ok: checks.every((c) => c.ok), checks };
}
export async function runDoctor(argv: string[]): Promise<void> {
  const args = parse(argv);
  if (args.positionals.length) throw new Error('doctor 不接受位置参数');
  const result = await diagnose(dataHome(string(args, 'home')));
  console.log(
    args.values.json
      ? JSON.stringify(result)
      : result.checks
          .map((c) => `${c.ok ? '✓' : '✗'} ${c.detail}${!c.ok && c.advice ? `；建议：${c.advice}` : ''}`)
          .join('\n'),
  );
  if (!result.ok) process.exitCode = 1;
}
