import type { Database } from '../db/connection.js';
export function releaseRows(db: Database, system: string) {
  return db.all('SELECT version,released_at,ref,note FROM releases WHERE system_key=? ORDER BY id', system);
}
