import type { Database } from '../db/connection.js';
export function releaseRows(db: Database, system: string) {
  // SELECT * also supports older databases opened by read-only diagnostics.
  return db
    .all('SELECT * FROM releases WHERE system_key=? ORDER BY id', system)
    .map(({ id: _id, system_key: _system, ...release }) => release);
}
