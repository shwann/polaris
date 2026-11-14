import type { Database, Row } from './connection.js';
import { databaseOpenError } from './openError.js';

export async function readOnly<T>(path: string, action: (db: Database) => T): Promise<T> {
  const { DatabaseSync } = await import('node:sqlite');
  let native: InstanceType<typeof DatabaseSync>;
  try {
    native = new DatabaseSync(path, { readOnly: true });
  } catch (error) {
    throw databaseOpenError(error, path);
  }
  const db: Database = {
    exec: (sql) => native.exec(sql),
    all: (sql, ...values) => native.prepare(sql).all(...values) as Row[],
    get: (sql, ...values) => native.prepare(sql).get(...values) as Row | undefined,
    run: () => {
      throw new Error('只读连接禁止写入');
    },
    close: () => native.close(),
  };
  try {
    // A short timeout keeps session hooks from delaying Claude during a concurrent write.
    db.exec('PRAGMA busy_timeout=100; PRAGMA query_only=ON; BEGIN;');
    return action(db);
  } finally {
    db.close();
  }
}
