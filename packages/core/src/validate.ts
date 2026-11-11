import { isLane, isReqPriority, isReqSource, isReqStatus, isStepState } from './enums.js';
import type { Requirement, Snapshot, Task } from './types.js';

export interface Issue {
  level: 'error' | 'warn';
  /** Where the problem is, e.g. `tasks/LOGIN` or `systems`. */
  path: string;
  message: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
export const isIsoTime = (v: unknown): v is string => typeof v === 'string' && ISO.test(v);

export function validateTask(t: Task, systemKeys: ReadonlySet<string>): Issue[] {
  const out: Issue[] = [];
  const path = `tasks/${t.id}`;
  const err = (message: string) => out.push({ level: 'error', path, message });
  const warn = (message: string) => out.push({ level: 'warn', path, message });
  for (const k of ['id', 'code', 'title', 'status'] as const) if (!t[k]) err(`缺 ${k}`);
  if (!isLane(t.lane)) err(`lane=${String(t.lane)} 不合法`);
  if (!isIsoTime(t.updatedAt)) err('updatedAt 不是带时区的 ISO 时间');
  if (!systemKeys.has(t.systemKey)) err(`systemKey=${t.systemKey} 不在系统清单里`);
  if (t.progress !== undefined && !(t.progress >= 0 && t.progress <= 100)) err('progress 应在 0～100');
  t.steps.forEach((s, i) => {
    if (!s.name) err(`第 ${i + 1} 步缺名称`);
    if (!isStepState(s.state)) err(`第 ${i + 1} 步 state=${String(s.state)} 不合法`);
  });
  if (t.lane === 'waiting' && !t.waitingSince) warn('waiting 组没有 waitingSince，等待天数会按 updatedAt 算');
  if (t.waitingSince && !isIsoTime(t.waitingSince)) err('waitingSince 不是带时区的 ISO 时间');
  return out;
}

export function validateRequirement(r: Requirement, systemKeys: ReadonlySet<string>): Issue[] {
  const out: Issue[] = [];
  const path = `requirements/${r.id}`;
  const err = (message: string) => out.push({ level: 'error', path, message });
  if (!r.id || !r.title) err('缺 id 或 title');
  if (!systemKeys.has(r.systemKey)) err(`systemKey=${r.systemKey} 不在系统清单里`);
  if (!isReqStatus(r.status)) err(`status=${String(r.status)} 不合法`);
  if (!isReqPriority(r.priority)) err(`priority=${String(r.priority)} 不合法`);
  if (!isReqSource(r.source)) err(`source=${String(r.source)} 不合法`);
  if (!isIsoTime(r.createdAt) || !isIsoTime(r.updatedAt)) err('createdAt / updatedAt 不是带时区的 ISO 时间');
  return out;
}

/** Whole-snapshot check: per-item rules plus cross references (system keys, task ↔ requirement links). */
export function validateSnapshot(s: Snapshot): Issue[] {
  const out: Issue[] = [];
  const keys = new Set(s.systems.map((x) => x.key));
  if (keys.size !== s.systems.length) out.push({ level: 'error', path: 'systems', message: '系统 key 重复' });
  if (!s.systems.length) out.push({ level: 'error', path: 'systems', message: '至少要有一个系统' });
  const taskIds = new Set(s.tasks.map((t) => t.id));
  const reqIds = new Set(s.requirements.map((r) => r.id));
  for (const t of s.tasks) {
    out.push(...validateTask(t, keys));
    for (const r of t.reqIds)
      if (!reqIds.has(r)) out.push({ level: 'error', path: `tasks/${t.id}`, message: `关联的需求 ${r} 不存在` });
  }
  for (const r of s.requirements) {
    out.push(...validateRequirement(r, keys));
    for (const t of r.taskIds)
      if (!taskIds.has(t))
        out.push({ level: 'error', path: `requirements/${r.id}`, message: `关联的任务 ${t} 不存在` });
  }
  const ats = s.events.map((e) => Date.parse(e.at));
  if (ats.some((a, i) => i > 0 && a > ats[i - 1]!))
    out.push({ level: 'warn', path: 'events', message: '动态不是新的在前' });
  return out;
}
