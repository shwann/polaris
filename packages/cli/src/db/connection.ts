const { DatabaseSync } = await import('node:sqlite');
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './migrate.js';
import { databaseOpenError } from './openError.js';

export type Value = string | number | null;
export type Row = Record<string, Value>;
export interface Database {
  exec(sql: string): void;
  all(sql: string, ...values: Value[]): Row[];
  get(sql: string, ...values: Value[]): Row | undefined;
  run(sql: string, ...values: Value[]): void;
  close(): void;
}
export function connect(path: string, initialize = true): Database {
  let native: InstanceType<typeof DatabaseSync>;
  try {
    mkdirSync(dirname(path), { recursive: true });
    native = new DatabaseSync(path);
  } catch (error) {
    throw databaseOpenError(error, path);
  }
  const db: Database = {
    exec: (sql) => native.exec(sql),
    all: (sql, ...values) => native.prepare(sql).all(...values) as Row[],
    get: (sql, ...values) => native.prepare(sql).get(...values) as Row | undefined,
    run: (sql, ...values) => {
      native.prepare(sql).run(...values);
    },
    close: () => native.close(),
  };
  try {
    db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
    if (initialize) migrate(db, path);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
export function transaction<T>(db: Database, action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function checkpointExisting(path: string): void {
  let db: Database | undefined;
  try {
    db = connect(path, false);
    if (db.get('PRAGMA wal_checkpoint(TRUNCATE)')?.busy !== 0)
      throw new Error('数据库仍被占用，请先停止 serve 和其他写入进程后再恢复');
  } catch (error) {
    // A corrupt database must still be recoverable from a verified SQL backup.
    const code = error && typeof error === 'object' && 'errcode' in error ? error.errcode : undefined;
    if (code !== 11 && code !== 26) throw error;
  } finally {
    db?.close();
  }
}
