import type { Context } from './context.js';
import { existing, required } from './context.js';
import { find, insert, remove, update, rows } from '../repo/rows.js';
import type { Row } from '../db/connection.js';
import { newId } from '../audit.js';
import { reqLinks } from '../repo/tasks.js';

export function changeTask(
  ctx: Context,
  action: string,
  id: string | undefined,
  patch: Row,
  req?: string,
  seq?: number,
): string {
  const { db, at } = ctx;
  const key = id || (typeof patch.code === 'string' ? patch.code : newId());
  if (action === 'add') {
    insert(db, 'tasks', {
      id: key,
      system_key: required(ctx.config.system, '--system'),
      code: key,
      title: required(String(patch.title ?? ''), '--title'),
      lane: 'planned',
      status: '待开工',
      created_at: at,
      updated_at: at,
      ...patch,
      ...(patch.lane === 'waiting' ? { waiting_since: at } : {}),
    });
    return key;
  }
  const old = existing(ctx, 'tasks', required(id, '任务 ID'));
  if (action === 'delete') {
    for (const link of reqLinks(db, key)) update(db, 'requirements', { id: link.req_id! }, { updated_at: at });
    remove(db, 'tasks', { id: key });
    return key;
  }
  if (action === 'link') {
    insert(db, 'task_requirements', { task_id: key, req_id: required(req, '--req') });
    update(db, 'requirements', { id: req! }, { updated_at: at });
  } else if (action === 'step') {
    if (seq === undefined || !Number.isInteger(seq) || seq < 1) throw new Error('--seq 必须是从 1 开始的步骤编号');
    const index = seq - 1;
    const step = find(db, 'task_steps', { task_id: key, seq: index });
    if (!step && index !== rows(db, 'task_steps').filter((s) => s.task_id === key).length)
      throw new Error('新步骤编号必须连续');
    const value = {
      name: required(String(patch.name ?? step?.name ?? ''), '--name'),
      state: patch.state ?? step?.state ?? 'todo',
    };
    if (step) update(db, 'task_steps', { task_id: key, seq: index }, value);
    else insert(db, 'task_steps', { task_id: key, seq: index, ...value });
  } else {
    if (action === 'move') required(typeof patch.lane === 'string' ? patch.lane : undefined, '--lane');
    const lane = patch.lane ?? old.lane;
    patch.waiting_since = lane === 'waiting' ? old.waiting_since || at : null;
    update(db, 'tasks', { id: key }, patch);
  }
  update(db, 'tasks', { id: key }, { updated_at: at });
  return key;
}
