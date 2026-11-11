import type { Database, Row, Value } from '../db/connection.js';

export const keys = {
  systems: ['key'],
  system_apps: ['system_key'],
  releases: ['id'],
  requirements: ['id'],
  requirement_acceptance: ['req_id', 'seq'],
  requirement_refs: ['req_id', 'seq'],
  tasks: ['id'],
  task_steps: ['task_id', 'seq'],
  task_requirements: ['task_id', 'req_id'],
  events: ['id'],
  changes: ['id'],
  schema_version: ['version'],
} as const;
export type Table = keyof typeof keys;
export const tables = Object.keys(keys) as Table[];
export const businessTables = tables.filter((t) => t !== 'changes' && t !== 'schema_version');
export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
export function rows(db: Database, table: Table): Row[] {
  return db.all(`SELECT * FROM ${quote(table)} ORDER BY ${keys[table].map(quote).join(',')}`);
}
export function identity(table: Table, row: Row): Row {
  return Object.fromEntries(keys[table].map((key) => [key, row[key]!]));
}
export function find(db: Database, table: Table, key: Row): Row | undefined {
  return db.get(
    `SELECT * FROM ${quote(table)} WHERE ${Object.keys(key)
      .map((k) => `${quote(k)}=?`)
      .join(' AND ')}`,
    ...Object.values(key),
  );
}
export function insert(db: Database, table: Table, row: Row): void {
  db.run(
    `INSERT INTO ${quote(table)} (${Object.keys(row).map(quote).join(',')}) VALUES (${Object.keys(row)
      .map(() => '?')
      .join(',')})`,
    ...Object.values(row),
  );
}
export function update(db: Database, table: Table, key: Row, patch: Row): void {
  if (!Object.keys(patch).length) return;
  db.run(
    `UPDATE ${quote(table)} SET ${Object.keys(patch)
      .map((k) => `${quote(k)}=?`)
      .join(',')} WHERE ${Object.keys(key)
      .map((k) => `${quote(k)}=?`)
      .join(' AND ')}`,
    ...Object.values(patch),
    ...Object.values(key),
  );
}
export function remove(db: Database, table: Table, key: Row): void {
  db.run(
    `DELETE FROM ${quote(table)} WHERE ${Object.keys(key)
      .map((k) => `${quote(k)}=?`)
      .join(' AND ')}`,
    ...Object.values(key),
  );
}
export function columns(db: Database, table: Table): string[] {
  return db.all(`PRAGMA table_info(${quote(table)})`).map((r) => String(r.name));
}
export function sqlValue(v: Value): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (v.includes('\0')) return `CAST(X'${Buffer.from(v).toString('hex')}' AS TEXT)`;
  return `'${v.replaceAll("'", "''")}'`;
}
