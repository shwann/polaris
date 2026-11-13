import type { Context } from './context.js';
import { existing, required } from './context.js';
import type { Row } from '../db/connection.js';
import { find, insert, remove, update } from '../repo/rows.js';
import { newId } from '../audit.js';
import { autoAccept } from './reqAutoAccept.js';

export function changeRequirement(
  ctx: Context,
  action: string,
  id: string | undefined,
  patch: Row,
  accept?: string[],
  refs?: string[],
  task?: string,
): { id: string; autoAccepted: string[] } {
  const key = id || newId(),
    { db, at } = ctx;
  if (action === 'add')
    insert(db, 'requirements', {
      id: key,
      system_key: required(ctx.config.system, '--system'),
      title: required(String(patch.title ?? ''), '--title'),
      source: 'user',
      priority: 'P1',
      status: 'proposed',
      created_at: at,
      updated_at: at,
      ...patch,
    });
  else {
    existing(ctx, 'requirements', required(id, '需求 ID'));
    if (action === 'move') required(typeof patch.status === 'string' ? patch.status : undefined, '--status');
    if (action === 'link' || action === 'unlink') {
      const taskId = required(task, '--task');
      existing(ctx, 'tasks', taskId);
      if (action === 'link') insert(db, 'task_requirements', { task_id: taskId, req_id: key });
      else remove(db, 'task_requirements', { task_id: taskId, req_id: key });
      update(db, 'tasks', { id: taskId }, { updated_at: at });
    } else update(db, 'requirements', { id: key }, patch);
    update(db, 'requirements', { id: key }, { updated_at: at });
  }
  if (accept) {
    remove(db, 'requirement_acceptance', { req_id: key });
    accept.forEach((text, seq) => insert(db, 'requirement_acceptance', { req_id: key, seq, text, met: 0 }));
  }
  if (refs) {
    remove(db, 'requirement_refs', { req_id: key });
    refs.forEach((ref, seq) => insert(db, 'requirement_refs', { req_id: key, seq, ref }));
  }
  return { id: key, autoAccepted: autoAccept(ctx, action === 'link' || action === 'unlink' ? [key] : []) };
}

export function checkRequirement(ctx: Context, id: string, item: number, met: boolean): string {
  existing(ctx, 'requirements', id);
  if (!Number.isInteger(item) || item < 1) throw new Error('--item 必须是从 1 开始的验收标准编号');
  const key = { req_id: id, seq: item - 1 };
  if (!find(ctx.db, 'requirement_acceptance', key)) throw new Error(`找不到第 ${item} 条验收标准`);
  update(ctx.db, 'requirement_acceptance', key, { met: met ? 1 : 0 });
  update(ctx.db, 'requirements', { id }, { updated_at: ctx.at });
  return id;
}
