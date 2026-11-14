import type { BoardView, Figure, Task } from './types';
import { FLOW, laneInfo } from './lanes';
import { ageText, since, fmt } from './time';
import { completion, nextCandidates, unverified, byOrder, needsMe, waitCounts } from './selectors';
export function waitNote(tasks: Task[], now = Date.now()) {
  const w = tasks.filter((t) => t.lane === 'waiting' && needsMe(t));
  if (!w.length) return '没有等你的事';
  const late = w.filter((t) => ageText(t, now)[1]).length;
  return late ? `${late} 项已超过 3 天` : '都在 3 天内';
}
export function releaseNote(v: BoardView) {
  const n = v.tasks.filter((t) => t.lane === 'release').length;
  const held = nextCandidates(v.tasks, v.app?.next)
    .filter((t) => t.lane !== 'release')
    .map((t) => t.code);
  return [n ? `${n} 项已合入` : '暂无已合入', held.length ? `${held.join('、')} 待处理` : ''].filter(Boolean);
}
export function appLine(v: BoardView) {
  const a = v.app;
  if (!a) return v.appNote ? [v.appNote] : [];
  const n = unverified(v.tasks).length;
  return [
    a.backend && `后端 ${a.backend}`,
    a.skill && `Skill ${(a.skill.match(/\d+/) || [a.skill])[0]}`,
    a.model && a.model.split('-')[0],
    n ? `待实证 ${n}` : '',
  ].filter((s): s is string => !!s);
}
/** 概况卡副标题 for the waiting card: who else it waits on, or the lateness note when only 等你 is left. */
export function waitFigureNote(tasks: Task[], now = Date.now()): string[] {
  const n = waitCounts(tasks.filter((t) => t.lane === 'waiting'));
  const others = [n.customer ? `等客户 ${n.customer}` : '', n.dependency ? `等前置 ${n.dependency}` : ''].filter(
    Boolean,
  );
  return others.length ? others : [waitNote(tasks, now)];
}
export function figures(v: BoardView, now = Date.now()): Figure[] {
  const c = completion(v.tasks),
    // The waiting card counts only 等你; 等客户 and 等前置 move to its subtitle.
    count = (lane: string) => v.tasks.filter((t) => t.lane === lane && (lane !== 'waiting' || needsMe(t))).length;
  const notes = [
    ['需求已写好', '排队待执行'],
    [count('doing') ? '正在推进' : '暂无进行中的任务'],
    waitFigureNote(v.tasks, now),
    releaseNote(v),
    ['等待实测验证'],
    c.total ? [`共 ${c.total} 项`, `完成 ${c.percent}%`] : [],
  ];
  const labels = ['待开工', '开发中', '等你', '等发版', '已知未验证', '已完成'];
  const tags = ['QUEUED', 'ACTIVE', 'NEEDS YOU', 'RELEASE', 'RISK', 'SHIPPED'];
  return [
    { label: '正式 App', tag: 'BUILD', value: v.appVersion, notes: appLine(v), color: '--lane-app', fraction: 1 },
    ...FLOW.map((lane, i) => ({
      label: labels[i]!,
      tag: tags[i]!,
      value: count(lane),
      notes: notes[i]!,
      color: laneInfo(lane).c,
      fraction: c.total ? count(lane) / c.total : 0,
      vivid: lane === 'doing' || lane === 'waiting',
    })),
  ];
}
export const codes = (ts: Task[], max = 6) =>
  ts
    .slice(0, max)
    .map((t) => t.code)
    .join(' · ') + (ts.length > max ? ` 等 ${ts.length} 项` : '');
export function groupDigest(tasks: Task[], now = Date.now()) {
  return (['waiting', 'release', 'risk', 'doing', 'planned'] as const).flatMap((key) => {
    const list = tasks.filter((t) => t.lane === key);
    if (!list.length) return [];
    const lane = laneInfo(key);
    const text =
      key === 'waiting'
        ? waitNote(tasks, now) +
          ' · ' +
          codes(
            list.sort((a, b) => since(a) - since(b)),
            4,
          )
        : key === 'release'
          ? codes(list) + ' 已合入'
          : codes(list.sort(byOrder));
    return [{ lane, title: `${lane.name} · ${list.length} 项`, text }];
  });
}
export function releaseDigest(v: BoardView) {
  const a = v.app,
    rows: { title: string; text: string; color: string }[] = [];
  const add = (title: string, text: string, color = '--cyan') => rows.push({ title, text, color });
  if (a) {
    add(
      '正式 App',
      `${a.version || '—'}${a.releasedAt ? ' · ' + fmt(a.releasedAt, true) + ' 上线' : ''}${a.backend && a.backend !== a.version ? ' · 后端 ' + a.backend : ''}`,
    );
    if (a.next)
      add(
        `下一版 ${a.next}`,
        `${nextCandidates(v.tasks, a.next).length} 项候选${a.nextNote ? ' · ' + a.nextNote : ''}`,
        '--amber',
      );
    const u = unverified(v.tasks);
    if (u.length) add(`待实证 · ${u.length} 项`, codes(u), '--amber');
    if (a.rollback) add('可回滚到', a.rollback);
  } else if (v.appVersion !== '—') add('正式 App', v.appVersion);
  return rows;
}
