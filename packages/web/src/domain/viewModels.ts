import type { BoardView, DisplaySnapshot, Filter, Task } from './types';
import { DIPPER, FIG_LANE, FLOW, laneInfo } from './lanes';
import {
  completion,
  filterSystem,
  flowTasks,
  filtering,
  matches,
  needsYouCount,
  lateTasks,
  nextCandidates,
  shipped,
  unverified,
  planFor,
} from './selectors';
import { isOld, todayEvents, fmt, ageText } from './time';
export function matrixModel(v: BoardView, f: Filter, now = Date.now()) {
  return {
    completion: completion(v.tasks),
    label: v.systemKey === 'all' ? '全部系统' : v.system.constellation || v.system.name,
    count: Math.max(1, v.tasks.length),
    cells: flowTasks(v.tasks).map((task, index) => {
      const lane = laneInfo(task.lane);
      return {
        task,
        index,
        lane,
        sub: lane.name + (task.status ? ' · ' + task.status : ''),
        hatch: task.lane === 'doing',
        old: isOld(task, now),
        dim: filtering(f) && !matches(task, f),
      };
    }),
    legend: FLOW.map((g) => ({ lane: laneInfo(g), count: v.tasks.filter((t) => t.lane === g).length })),
  };
}
export const tabsModel = (v: BoardView, s: DisplaySnapshot | null) =>
  v.systems.map((x) => ({ ...x, completion: completion(filterSystem(s?.tasks || [], x.key)) }));
export function watchModel(v: BoardView, s: DisplaySnapshot | null, now = Date.now()) {
  const me = needsYouCount(v.tasks),
    late = lateTasks(v.tasks, now).length,
    nx = nextCandidates(v.tasks, v.app?.next).length,
    c = completion(s?.tasks || []);
  return {
    late: !!late,
    me: `${me} 项`,
    meNote: late ? `${late} 项超 3 天` : me ? '都在 3 天内' : '没有',
    next: v.app?.next || '—',
    nextNote: v.app?.next ? `${nx} 项候选 · 现为 ${v.app.version}` : v.app?.version ? `现为 ${v.app.version}` : '暂无',
    percent: c.total ? `${c.percent}%` : '—',
    totalNote: c.total ? `${c.done} / ${c.total} · 全部系统` : '',
  };
}
export function poleModel(v: BoardView, s: DisplaySnapshot | null, now = new Date()) {
  const c = completion(s?.tasks || []);
  return {
    summary: `${v.systems.length} 个系统共 ${c.total} 项 · 已完成 ${c.percent}% · 今日动态 ${todayEvents(s?.events || [], now).length} 条`,
    systems: tabsModel(v, s).map((x) => ({
      ...x,
      note: x.completion.total ? `${x.completion.done}/${x.completion.total} · ${x.completion.percent}%` : '暂无',
    })),
    modules: DIPPER.map((star, index) => {
      const g = FIG_LANE[index],
        lane = g ? laneInfo(g) : null,
        n = g ? v.tasks.filter((t) => t.lane === g).length : null;
      return { star, index, lane, note: n === null ? v.appVersion : n ? `${n} 项` : '暂无' };
    }),
    selected: `${v.systemKey === 'all' ? '全部系统' : `${v.system.constellation} · ${v.system.name}`} 的七个模块 · 点一组展开`,
    latest:
      s?.events.slice(0, 3).map((it) => ({
        key: it.at + it.text,
        text: `${fmt(it.at, true)} · ${it.text.slice(0, 60)}${it.text.length > 60 ? '…' : ''}`,
      })) || [],
  };
}
export function appPanelModel(v: BoardView) {
  const a = v.app,
    cur = v.appVersion;
  return {
    a,
    cur,
    ship: shipped(v.tasks, cur),
    plan: planFor(v.tasks, cur),
    unv: unverified(v.tasks),
    next: nextCandidates(v.tasks, a?.next),
    np: a?.next ? planFor(v.tasks, a.next, true) : null,
    appText: `${cur}${a?.build ? ' · ' + a.build : ''}${a?.releasedAt ? ' · ' + fmt(a.releasedAt, true) + ' 上线' : ''}`,
    backendText: `${a?.backend || ''}${a?.backendBuild ? '（' + a.backendBuild + '）' : ''}${a?.backend !== cur ? ' · 这版没换' : ''}`,
    releases: v.releases.map((r) => ({
      ...r,
      current: r.version === cur,
      title: [r.version, fmt(r.releasedAt, true), r.ref, r.note].filter(Boolean).join(' · '),
      date: fmt(r.releasedAt, true).slice(0, 5),
    })),
  };
}
export const groupItems = (list: Task[], all: boolean, now = Date.now()) =>
  (all ? list : list.slice(0, 8)).map((task) => {
    const [age, late] = task.lane === 'waiting' ? ageText(task, now) : ['', false];
    return { task, late, right: age ? age.replace('已等', '') : task.status };
  });
export const groupNote = (n: number, all: boolean) =>
  n
    ? all || n <= 8
      ? `星图上连着这一组全部 ${n} 颗星 · 点一项看详情`
      : `先连前 8 项 · 展开后连到全部 ${n} 颗星`
    : '这一组现在没有任务';
export const selectedTask = (v: BoardView, id: string | null) => v.tasks.find((t) => t.id === id);
export const segments = (fraction: number) => Array.from({ length: 12 }, (_, k) => k < Math.round(fraction * 12));
export const matchCount = (v: BoardView, f: Filter) =>
  filtering(f) ? `命中 ${v.tasks.filter((t) => matches(t, f)).length} / ${v.tasks.length} 项` : '';
