import { validateSnapshot } from '@polaris/core';
import type { Database } from '../db/connection.js';
import { transaction } from '../db/connection.js';
import { snapshot } from '../export/snapshot.js';
import { audit, capture, newId, recordEvent } from '../audit.js';
import { find, type Table } from '../repo/rows.js';
import type { Config } from '../config.js';

export interface Context {
  db: Database;
  config: Config;
  at: string;
}
export function validate(db: Database, allowEmpty = false): void {
  const data = snapshot(db);
  if (allowEmpty && !data.systems.length && !data.tasks.length && !data.requirements.length && !data.events.length)
    return;
  const errors = validateSnapshot(data).filter((i) => i.level === 'error');
  if (errors.length) throw new Error(errors.map((i) => `${i.path}: ${i.message}`).join('；'));
}
export function write(ctx: Context, text: string, action: () => unknown, preserveEvents = false) {
  return transaction(ctx.db, () => {
    validate(ctx.db, true);
    const before = capture(ctx.db),
      batch = newId();
    const result = action();
    if (!preserveEvents)
      recordEvent(ctx.db, ctx.at, ctx.config.actor === 'web' ? `[web] ${text}` : text, ctx.config.system);
    validate(ctx.db);
    audit(ctx.db, before, batch, ctx.config.actor, ctx.at);
    return { batch, text, result };
  });
}
export function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`请提供 ${label}`);
  return value;
}
export function existing(ctx: Context, table: Table, id: string) {
  const row = find(ctx.db, table, { [table === 'systems' ? 'key' : 'id']: id });
  if (!row) throw new Error(`找不到 ${table}：${id}`);
  return row;
}
