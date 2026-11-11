import type { Context } from './context.js';
import type { Row, Value } from '../db/connection.js';
import { batchRows } from '../repo/events.js';
import { businessTables, find, insert, remove, update, type Table } from '../repo/rows.js';

export function undo(ctx: Context, batch: string): void {
  const changes = batchRows(ctx.db, batch);
  if (!changes.length) throw new Error(`找不到批次 ${batch}`);
  const groups = new Map<string, { table: Table; key: Row; old: Row; next: Row; op: string }>();
  for (const c of changes) {
    const table = String(c.entity) as Table;
    if (!businessTables.some((t) => t === table)) throw new Error('审计记录包含未知表');
    const groupKey = `${table}:${c.entity_id}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = { table, key: JSON.parse(String(c.entity_id)) as Row, old: {}, next: {}, op: String(c.op) };
      groups.set(groupKey, group);
    }
    group.old[String(c.field)] = JSON.parse(String(c.old)) as Value;
    group.next[String(c.field)] = JSON.parse(String(c.new)) as Value;
  }
  ctx.db.exec('PRAGMA defer_foreign_keys=ON');
  for (const g of groups.values()) {
    const current = find(ctx.db, g.table, g.key);
    if ((g.op === 'delete' && current) || (g.op !== 'delete' && !current)) throw new Error('数据已变化，无法安全撤销');
    if (current && Object.entries(g.next).some(([k, v]) => current[k] !== v))
      throw new Error('字段已被后续命令修改，无法安全撤销');
  }
  // Reverse updates first: cascading deletes must not erase rows needed by conflict checks.
  for (const g of groups.values()) if (g.op === 'update') update(ctx.db, g.table, g.key, g.old);
  for (const table of businessTables)
    for (const g of groups.values()) if (g.table === table && g.op === 'delete') insert(ctx.db, table, g.old);
  for (const table of [...businessTables].reverse())
    for (const g of groups.values()) if (g.table === table && g.op === 'insert') remove(ctx.db, table, g.key);
}
