import type { Database } from '../db/connection.js';
export function taskRows(db: Database) {
  return db.all("SELECT * FROM tasks ORDER BY id || '.json'");
}
export function stepRows(db: Database, id: string) {
  return db.all('SELECT name,state FROM task_steps WHERE task_id=? ORDER BY seq', id);
}
export function reqLinks(db: Database, id: string) {
  return db.all('SELECT req_id FROM task_requirements WHERE task_id=? ORDER BY req_id', id);
}
