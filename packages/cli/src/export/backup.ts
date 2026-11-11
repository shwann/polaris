import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Database } from '../db/connection.js';
import { connect, transaction, checkpointExisting } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { tables, quote, rows, sqlValue } from '../repo/rows.js';
import { schemaRows, indexRows } from '../repo/maintenance.js';
import { integrity } from '../repo/events.js';
import { validate } from '../service/context.js';
import { newId } from '../audit.js';

export function dump(db: Database): string {
  const lines = ['PRAGMA foreign_keys=OFF;', 'BEGIN IMMEDIATE;'];
  for (const s of schemaRows(db)) lines.push(`${String(s.sql)};`);
  for (const table of tables)
    for (const row of rows(db, table)) {
      lines.push(
        `INSERT INTO ${quote(table)} (${Object.keys(row).map(quote).join(',')}) VALUES (${Object.values(row).map(sqlValue).join(',')});`,
      );
    }
  for (const index of indexRows(db)) lines.push(`${String(index.sql)};`);
  return [...lines, 'COMMIT;', 'PRAGMA foreign_keys=ON;', ''].join('\n');
}
export function backup(db: Database, home: string, text: string): { file: string; warning?: string } {
  return transaction(db, () => {
    const dir = join(home, 'backup'),
      file = join(dir, 'polaris.sql');
    mkdirSync(dir, { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, dump(db));
    renameSync(temp, file);
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      execFileSync('git', ['--version'], { stdio: 'ignore' });
    } catch {
      return { file, warning: '本机没有 git，已导出 SQL，未提交' };
    }
    try {
      if (!existsSync(join(dir, '.git'))) git('init', '--quiet');
      git('add', '--', 'polaris.sql');
      git(
        '-c',
        'user.name=Polaris',
        '-c',
        'user.email=polaris@localhost',
        '-c',
        'commit.gpgsign=false',
        'commit',
        '--allow-empty',
        '--quiet',
        '-m',
        text,
      );
      return { file };
    } catch {
      return { file, warning: 'SQL 已导出，但备份 git 提交失败，请检查 backup 仓库' };
    }
  });
}
export function restore(file: string, path: string): { retained?: string } {
  const sql = readFileSync(resolve(file), 'utf8');
  const temp = `${path}.restore-${newId()}`;
  // Restore into an isolated database and verify before touching the live database.
  let db: Database | undefined;
  try {
    db = connect(temp, false);
    db.exec('PRAGMA foreign_keys=OFF');
    db.exec(sql);
    migrate(db, temp);
    validate(db, true);
    const checks = integrity(db);
    if (checks.integrity.some((r) => r.integrity_check !== 'ok') || checks.foreignKeys.length)
      throw new Error('备份数据库完整性检查失败');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.close();
    db = undefined;
    let retained: string | undefined;
    if (existsSync(path)) {
      checkpointExisting(path);
      retained = `${path}.before-restore-${newId()}`;
      renameSync(path, retained);
      for (const suffix of ['-wal', '-shm'])
        if (existsSync(`${path}${suffix}`)) renameSync(`${path}${suffix}`, `${retained}${suffix}`);
    }
    try {
      renameSync(temp, path);
    } catch (error) {
      if (retained) renameSync(retained, path);
      throw error;
    }
    return { retained };
  } finally {
    db?.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${temp}${suffix}`, { force: true });
  }
}
