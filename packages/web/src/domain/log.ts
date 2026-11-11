import type { EventItem } from './types';
import { dayKey, ago, fmt, p2 } from './time';
const KINDS: [string, string, RegExp][] = [
  ['决定', '--coral', /你定|已定|决定|你确认|目视确认|签认|你批准/],
  ['发版', '--amber', /发版|发布/],
  ['核对', '--green', /(检查|核对|核验|回归).{0,14}(通过|全过|一致)|^核对/],
  ['合入', '--cyan', /合入|合并/],
  ['完成', '--blue', /完成/],
  ['修复', '--violet', /修复|修好/],
  ['调整', '--blue', /改为|调整/],
  ['开始', '--blue', /开始|开通|派出|启动/],
];
export const kindOf = (text: string) => KINDS.find(([, , re]) => re.test(text)) || ['记录', '--slate'];
export function logModel(events: EventItem[], now = new Date()) {
  const today = dayKey(now),
    items = events.slice(0, 40),
    hours: number[] = Array(24).fill(0);
  for (const it of items) {
    const d = new Date(it.at);
    if (!isNaN(+d) && dayKey(d) === today) hours[d.getHours()]!++;
  }
  const peak = Math.max(1, ...hours),
    todayN = hours.reduce((a, b) => a + b, 0);
  let lastDay: string | null = null;
  const rows = items.map((it, k) => {
    const d = new Date(it.at),
      valid = !isNaN(+d),
      dk = valid ? dayKey(d) : '',
      divider =
        k > 0 && dk !== lastDay
          ? dk === today
            ? '今天'
            : dk
              ? `${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
              : '更早'
          : '';
    lastDay = dk;
    const [name, color] = kindOf(it.text);
    return {
      ...it,
      key: it.at + ':' + it.text,
      name,
      color,
      divider,
      latest: k === 0,
      time: valid
        ? dk === today
          ? `${p2(d.getHours())}:${p2(d.getMinutes())}`
          : fmt(it.at, true)
        : String(it.at || ''),
      ago: valid ? ago(d, +now) : '',
      lines: k === 0 ? 4 : 2,
    };
  });
  return {
    todayN,
    rows,
    pulse: hours.map((n, h) => ({
      on: !!n,
      now: h === now.getHours(),
      height: n / peak,
      title: `${p2(h)}:00 · ${n} 条`,
    })),
  };
}
