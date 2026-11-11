import { LATE_DAYS, type Snapshot } from '@polaris/core';

export function status(data: Snapshot, system?: string, now = Date.now()) {
  if (system && !data.systems.some((s) => s.key === system)) throw new Error(`找不到系统：${system}`);
  const tasks = data.tasks.filter((t) => !system || t.systemKey === system);
  const waiting = tasks
    .filter((t) => t.needs || t.lane === 'waiting')
    .map((t) => {
      const days = Math.max(0, Math.floor((now - Date.parse(t.waitingSince || t.updatedAt)) / 86400000));
      return { ...t, days, late: days > LATE_DAYS };
    })
    .sort((a, b) => b.days - a.days);
  const candidates = tasks.filter((t) => t.lane === 'release' || t.targetRelease);
  const unverified = tasks.filter((t) => t.lane === 'risk' || t.unverified);
  const done = tasks.filter((t) => t.lane === 'done').length;
  return {
    waiting,
    candidates,
    unverified,
    total: tasks.length,
    done,
    completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
export function statusText(value: ReturnType<typeof status>): string {
  const list = (tasks: Array<{ code: string; title: string }>) =>
    tasks.map((t) => `${t.code} ${t.title}`).join('；') || '无';
  return [
    `需要你：${value.waiting.map((t) => `${t.code} ${t.needs || t.title}（${t.days} 天${t.late ? '，超过 3 天' : ''}）`).join('；') || '无'}`,
    `下一版候选：${list(value.candidates)}`,
    `已知未验证：${list(value.unverified)}`,
    `完成比例：${value.done}/${value.total}（${value.completion}%）`,
  ].join('\n');
}
