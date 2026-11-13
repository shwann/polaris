import { dispatchError, type DispatchSetting } from '@polaris/core';
import type { Database, Row } from '../db/connection.js';
import type { Context } from './context.js';
import { existing } from './context.js';
import { find } from '../repo/rows.js';
import { dispatchRows, dispatchValue, insertDispatch, taskDispatchAudit } from '../repo/dispatch.js';
import { newId } from '../audit.js';

export function setDispatch(ctx: Context, values: Row): void {
  const error = dispatchError(values.engine, values.model, values.effort);
  if (error) throw new Error(error);
  const system = ctx.config.system || 'beidou';
  existing(ctx, 'systems', system);
  insertDispatch(ctx.db, {
    id: newId(),
    system_key: system,
    engine: values.engine!,
    model: values.model!,
    effort: values.effort!,
    note: values.note ?? '',
    by_name: values.by ?? '用户',
    actor: ctx.config.actor,
    set_at: ctx.at,
  });
}

export function taskDispatchPatch(value: string): Row {
  if (value === '') return { dispatch_engine: null, dispatch_model: null, dispatch_effort: null };
  const parts = value.split('/');
  if (parts.length !== 3) throw new Error('--dispatch 必须是 engine/model/effort 三段');
  const [engine, model, effort] = parts;
  const error = dispatchError(engine, model, effort);
  if (error) throw new Error(error);
  return { dispatch_engine: engine!, dispatch_model: model!, dispatch_effort: effort! };
}

export function showDispatch(db: Database, system = 'beidou', task?: string, history = false) {
  const t = task === undefined ? undefined : find(db, 'tasks', { id: task });
  if (task !== undefined && !t) throw new Error(`找不到任务：${task}`);
  if (t) system = String(t.system_key);
  const settings = dispatchRows(db, system, history ? undefined : 1).map((r) => dispatchValue(r, task));
  let current = settings[0];
  if (t?.dispatch_engine) {
    const audit = taskDispatchAudit(db, task!);
    current = {
      system,
      engine: t.dispatch_engine as DispatchSetting['engine'],
      model: String(t.dispatch_model),
      effort: String(t.dispatch_effort),
      note: '',
      by: '用户',
      actor: String(audit?.actor ?? ''),
      setAt: String(audit?.at ?? t.updated_at),
      source: 'task',
      task,
    };
  }
  if (!current) throw new Error(`系统 ${system} 尚未设置派工，请先运行 dispatch set`);
  return history ? { current, history: settings } : current;
}
