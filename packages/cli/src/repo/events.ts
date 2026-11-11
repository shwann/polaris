import type { Database } from '../db/connection.js';
export function eventRows(db: Database, limit: number) {
  return db.all(
    'SELECT at,text,system_key,task_id,req_id FROM events ORDER BY julianday(at) DESC,at DESC,id LIMIT ?',
    limit,
  );
}
export function batchRows(db: Database, batch: string) {
  return db.all('SELECT * FROM changes WHERE batch=? ORDER BY id DESC', batch);
}
export function integrity(db: Database) {
  return { integrity: db.all('PRAGMA integrity_check'), foreignKeys: db.all('PRAGMA foreign_key_check') };
}
