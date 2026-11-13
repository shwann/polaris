import type { Database } from '../db/connection.js';
import type { Context } from './context.js';
import { update } from '../repo/rows.js';
import { recordEvent } from '../audit.js';

export function readyForAcceptance(db: Database, reqIds?: readonly string[]) {
  if (reqIds?.length === 0) return [];
  return db.all(
    `SELECT r.id,r.system_key FROM requirements r
     WHERE r.status IN ('confirmed','scheduled','in_progress')
       ${reqIds ? `AND r.id IN (${reqIds.map(() => '?').join(',')})` : ''}
       AND EXISTS (SELECT 1 FROM task_requirements tr WHERE tr.req_id=r.id)
       AND NOT EXISTS (
         SELECT 1 FROM task_requirements tr JOIN tasks t ON t.id=tr.task_id
         WHERE tr.req_id=r.id AND t.lane<>'done'
       )
     ORDER BY r.id`,
    ...(reqIds ?? []),
  );
}

export function autoAccept(ctx: Context, reqIds: string[]): string[] {
  const accepted = readyForAcceptance(ctx.db, [...new Set(reqIds)]);
  for (const req of accepted) {
    update(ctx.db, 'requirements', { id: req.id! }, { status: 'acceptance', updated_at: ctx.at });
    recordEvent(ctx.db, ctx.at, `需求 ${req.id} 关联任务已全部完成，自动转为待验收`, String(req.system_key));
  }
  return accepted.map((req) => String(req.id));
}
