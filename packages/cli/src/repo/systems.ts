import type { Database } from '../db/connection.js';
export function systemRows(db: Database) {
  return db.all('SELECT * FROM systems ORDER BY sort,key');
}
export function appRow(db: Database, key: string) {
  return db.get('SELECT * FROM system_apps WHERE system_key=?', key);
}
