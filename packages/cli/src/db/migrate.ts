import { copyFileSync, existsSync } from 'node:fs';
import type { Database } from './connection.js';
import init from './migrations/0001_init.sql?raw';
import dispatch from './migrations/0002_dispatch.sql?raw';

const migrations = [
  { version: 1, sql: init },
  { version: 2, sql: dispatch },
];
export function migrate(db: Database, path: string): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    const exists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'");
    const version = exists ? Number(db.get('SELECT MAX(version) AS v FROM schema_version')?.v ?? 0) : 0;
    if (version > migrations.length) throw new Error('数据库版本较新，请更新北辰命令行');
    const hasTables = !!db.get("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1");
    if (version < migrations.length && hasTables && existsSync(path)) {
      // Preserve the main database and its WAL together while holding the writer lock.
      const backup = `${path}.before-migration-${Date.now()}`;
      copyFileSync(path, backup);
      if (existsSync(`${path}-wal`)) copyFileSync(`${path}-wal`, `${backup}-wal`);
    }
    for (const item of migrations.filter((m) => m.version > version)) {
      db.exec(item.sql);
      db.run('INSERT INTO schema_version VALUES (?,?)', item.version, new Date().toISOString());
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
