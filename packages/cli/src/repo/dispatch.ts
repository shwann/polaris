import type { DispatchEngine, DispatchSetting } from '@polaris/core';
import type { Database, Row } from '../db/connection.js';
import { insert } from './rows.js';

/** Older databases are read without migrating them by hooks and read-only boards. */
export function dispatchRows(db: Database, system: string, limit?: number): Row[] {
  if (!db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='dispatch_settings'")) return [];
  return db.all(
    `SELECT * FROM dispatch_settings WHERE system_key=? ORDER BY set_at DESC,id DESC${limit === undefined ? '' : ' LIMIT ?'}`,
    system,
    ...(limit === undefined ? [] : [limit]),
  );
}
export function dispatchValue(row: Row, task?: string): DispatchSetting {
  return {
    system: String(row.system_key),
    engine: row.engine as DispatchSetting['engine'],
    model: String(row.model),
    effort: String(row.effort),
    note: String(row.note),
    by: String(row.by_name),
    actor: String(row.actor),
    setAt: String(row.set_at),
    source: 'system',
    ...(task === undefined ? {} : { task }),
  };
}
export const insertDispatch = (db: Database, row: Row) => insert(db, 'dispatch_settings', row);

export function dispatchModels(db: Database, system: string): Partial<Record<DispatchEngine, string[]>> {
  const models: Partial<Record<DispatchEngine, string[]>> = {};
  for (const row of db.all(
    'SELECT DISTINCT engine,model FROM dispatch_settings WHERE system_key=? ORDER BY model',
    system,
  )) {
    (models[row.engine as DispatchEngine] ??= []).push(String(row.model));
  }
  return models;
}

export function taskDispatchAudit(db: Database, id: string): Row | undefined {
  return db.get(
    `SELECT actor,at FROM changes WHERE entity='tasks' AND entity_id=?
     AND field IN ('dispatch_engine','dispatch_model','dispatch_effort')
     ORDER BY at DESC,id DESC LIMIT 1`,
    JSON.stringify({ id }),
  );
}
