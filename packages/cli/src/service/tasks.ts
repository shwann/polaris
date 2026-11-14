import type { Context } from './context.js';
import { existing, required } from './context.js';
import { find, insert, remove, update, rows } from '../repo/rows.js';
import type { Row } from '../db/connection.js';
import { newId } from '../audit.js';
import { reqLinks } from '../repo/tasks.js';
import { autoAccept } from './reqAutoAccept.js';

const waitingOnMisplaced = '--waiting-on 只用于等待中（--lane waiting）或填了 --needs 的任务';

export function changeTask(
  ctx: Context,
  action: string,
  id: string | undefined,
  patch: Row,
  req?: string,
  seq?: number,
): { id: string; autoAccepted: string[] } {
  const { db, at } = ctx;
  const key = id || (typeof patch.code === 'string' ? patch.code : newId());
  if (action === 'add') {
    if (patch.waiting_on && patch.lane !== 'waiting' && !patch.needs) throw new Error(waitingOnMisplaced);
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
    return {
      id: key,
      autoAccepted: autoAccept(
        ctx,
        reqLinks(db, key).map((link) => String(link.req_id)),
      ),
    };
  }
  const old = existing(ctx, 'tasks', required(id, '任务 ID'));
  if (action === 'delete') {
    const reqIds = reqLinks(db, key).map((link) => String(link.req_id));
    for (const reqId of reqIds) update(db, 'requirements', { id: reqId }, { updated_at: at });
    remove(db, 'tasks', { id: key });
    return { id: key, autoAccepted: autoAccept(ctx, reqIds) };
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
    // 等谁 only means something while the task waits or asks the user for something.
    if (lane !== 'waiting' && !String(patch.needs !== undefined ? (patch.needs ?? '') : (old.needs ?? '')).trim()) {
      if (patch.waiting_on) throw new Error(waitingOnMisplaced);
      if (old.waiting_on !== null && old.waiting_on !== undefined) patch.waiting_on = null;
    }
    update(db, 'tasks', { id: key }, patch);
  }
  update(db, 'tasks', { id: key }, { updated_at: at });
  const reqIds =
    action === 'link'
      ? [req!]
      : patch.lane !== undefined && patch.lane !== old.lane
        ? reqLinks(db, key).map((link) => String(link.req_id))
        : [];
  return { id: key, autoAccepted: autoAccept(ctx, reqIds) };
}
