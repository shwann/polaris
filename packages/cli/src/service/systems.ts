import type { Context } from './context.js';
import type { Row } from '../db/connection.js';
import { existing, required } from './context.js';
import { insert, update } from '../repo/rows.js';
export function changeSystem(ctx: Context, action: string, id: string | undefined, patch: Row): string {
  const key = required(id || ctx.config.system, '系统 key 或 --system');
  if (action === 'add') insert(ctx.db, 'systems', { key, constellation: '北斗', name: key, sort: 0, ...patch });
  else {
    existing(ctx, 'systems', key);
    update(ctx.db, 'systems', { key }, patch);
  }
  return key;
}
