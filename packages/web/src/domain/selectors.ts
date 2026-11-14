import { WAITING_ON, waitingOnOf, type WaitingOn } from '@polaris/core';
import type { BoardView, DisplaySnapshot, Filter, Task, Lane, SystemInfo } from './types';
import { FLOW } from './lanes';
import { ageText, since, isOld } from './time';
const DEFAULT: SystemInfo = { key: 'main', constellation: '北斗', name: '我的系统', sort: 0, app: null, releases: [] };
export const systems = (s: DisplaySnapshot | null) => (s?.systems.length ? s.systems : [DEFAULT]);
export const filterSystem = (tasks: Task[], key: string) =>
  key === 'all' ? tasks : tasks.filter((t) => t.systemKey === key);
export function selectView(s: DisplaySnapshot | null, selection: string): BoardView {
  const list = systems(s),
    key = selection === 'all' || list.some((x) => x.key === selection) ? selection : list[0]!.key;
  const system = list.find((x) => x.key === key) || list[0]!,
    own = key === list[0]!.key || key === 'all',
    p = s?.presentation;
  return {
    tasks: filterSystem(s?.tasks || [], key),
    systemKey: key,
    system,
    systems: list,
    app: own && p?.primaryAppPresent === false ? null : system.app,
    releases: system.releases,
    appVersion: system.app?.version || (own ? p?.appVersion : undefined) || '—',
    appNote: (own ? p?.appNote : system.note) || '',
    nextRelease: (own ? p?.nextRelease : '') || '',
    note: p?.note || '',
  };
}
export const byOrder = (a: Task, b: Task) => (a.sort ?? 999) - (b.sort ?? 999);
export { waitingOnOf };
/** Only 等你 counts as needing the user; 等客户 and 等前置 wait on someone else. */
export const needsMe = (t: Task) => waitingOnOf(t) === 'user';
export const needsYouCount = (tasks: Task[]) => tasks.filter(needsMe).length;
/** Waiting tasks counted per category (等你 includes NULL). */
export function waitCounts(tasks: Task[]): Record<WaitingOn, number> {
  const out = { user: 0, customer: 0, dependency: 0 };
  for (const t of tasks) {
    const w = waitingOnOf(t);
    if (w) out[w]++;
  }
  return out;
}
/** A waiting task's split into its three sections, in display order. */
export const waitingParts = (list: Task[]) =>
  WAITING_ON.map((key) => ({ key, list: list.filter((t) => waitingOnOf(t) === key) }));
export const lateTasks = (tasks: Task[], now = Date.now()) =>
  tasks.filter((t) => t.lane === 'waiting' && needsMe(t) && ageText(t, now)[1]);
export const isPlan = (t: Task) => /^REL/.test(t.code);
export const nextCandidates = (tasks: Task[], version?: string) =>
  version ? tasks.filter((t) => t.targetRelease === version && !isPlan(t)) : [];
export const shipped = (tasks: Task[], version: string) => tasks.filter((t) => t.shippedIn === version && !isPlan(t));
export const unverified = (tasks: Task[]) => tasks.filter((t) => t.unverified);
export function completion(tasks: Task[]) {
  const total = tasks.length,
    done = tasks.filter((t) => t.lane === 'done').length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0, fraction: total ? done / total : 0 };
}
export const taskProgress = (t: Task) =>
  typeof t.progress === 'number'
    ? t.progress
    : t.steps.length
      ? Math.round((t.steps.filter((s) => s.state === 'done').length / t.steps.length) * 100)
      : null;
export const filtering = (f: Filter) => !!f.query || f.mineOnly;
export function matches(t: Task, f: Filter) {
  if (f.mineOnly && !needsMe(t)) return false;
  const hay = [t.code, t.title, t.detail, t.needs, t.status, t.owner].filter(Boolean).join(' ').toLowerCase();
  return f.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
export const searchTasks = (tasks: Task[], f: Filter) => tasks.filter((t) => matches(t, f));
export const flowTasks = (tasks: Task[]) =>
  [...tasks].sort((a, b) => FLOW.indexOf(a.lane) - FLOW.indexOf(b.lane) || byOrder(a, b));
export function laneTasks(tasks: Task[], lane: Lane) {
  return tasks
    .filter((t) => t.lane === lane)
    .sort(
      lane === 'waiting'
        ? (a, b) => since(a) - since(b)
        : lane === 'done'
          ? (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
          : byOrder,
    );
}
export const archiveTasks = (tasks: Task[], now = Date.now()) => ({
  recent: tasks.filter((t) => !isOld(t, now)),
  older: tasks.filter((t) => isOld(t, now)),
});
export const systemLabel = (v: BoardView) =>
  v.systemKey === 'all' ? '全部系统' : v.system.constellation || v.system.name;
export const latestUpdate = (s: DisplaySnapshot | null, tasks: Task[]) =>
  [s?.updatedAt, ...tasks.map((t) => t.updatedAt)]
    .filter((v): v is string => !!v && !isNaN(+new Date(v)))
    .sort((a, b) => +new Date(b) - +new Date(a))[0];
export const planFor = (tasks: Task[], version: string, next = false) =>
  tasks.find((t) => (next ? t.targetRelease : t.shippedIn) === version && isPlan(t));
