import type { Database } from '../db/connection.js';
import { tables } from './rows.js';
export function schemaRows(db: Database) {
  return tables.map((name) => db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", name)!);
}
export function indexRows(db: Database) {
  return db.all("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name");
}
