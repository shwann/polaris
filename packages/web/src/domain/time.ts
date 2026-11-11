import type { Task, EventItem } from './types';
export const DAY = 86400000,
  LATE_DAYS = 3,
  RECENT_DAYS = 3;
export const p2 = (n: number) => String(n).padStart(2, '0');
export const since = (t: Task) => new Date(t.waitingSince || t.updatedAt || 0).getTime();
export const waitingDays = (t: Task, now = Date.now()) => Math.floor((now - since(t)) / DAY);
export function ageText(t: Task, now = Date.now()): [string, boolean] {
  const ms = now - since(t);
  if (!(ms >= 0)) return ['', false];
  const d = Math.floor(ms / DAY),
    h = Math.floor(ms / 3600000);
  return [d >= 1 ? `已等 ${d} 天` : h >= 1 ? `已等 ${h} 小时` : '刚提出', d >= LATE_DAYS];
}
export const isOld = (t: Task, now = Date.now()) =>
  t.lane === 'done' && now - new Date(t.updatedAt || 0).getTime() > RECENT_DAYS * DAY;
export function fmt(s?: string, short = false) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(+d)) return String(s);
  const md = `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return short ? md : `${d.getFullYear()}-${md}`;
}
export const dayKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export function ago(d: Date, now = Date.now()) {
  const m = Math.round((now - +d) / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} 小时前` : '';
}
export function clockText(d: Date) {
  return {
    time: `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
    date: `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} · 星期${'日一二三四五六'[d.getDay()]}`,
  };
}
export const todayEvents = (items: EventItem[], now = new Date()) =>
  items.filter((it) => new Date(it.at).toDateString() === now.toDateString());
