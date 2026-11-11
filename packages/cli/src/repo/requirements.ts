import type { Database } from '../db/connection.js';
export function requirementRows(db: Database) {
  return db.all('SELECT * FROM requirements ORDER BY id');
}
export function acceptanceRows(db: Database, id: string) {
  return db.all('SELECT text,met FROM requirement_acceptance WHERE req_id=? ORDER BY seq', id);
}
export function refRows(db: Database, id: string) {
  return db.all('SELECT ref FROM requirement_refs WHERE req_id=? ORDER BY seq', id);
}
export function taskLinks(db: Database, id: string) {
  return db.all('SELECT task_id FROM task_requirements WHERE req_id=? ORDER BY task_id', id);
}
