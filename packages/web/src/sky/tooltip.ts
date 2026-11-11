import { DIPPER, FIG_LANE, LANES } from '../domain/lanes';
import type { SkyState } from './types';
export function emitTooltip(s: SkyState) {
  s.events.onCursor?.(s.drag ? 'grabbing' : s.hover || s.dipHover >= 0 ? 'pointer' : s.sky && s.onSky ? 'grab' : '');
  if (s.drag) {
    s.events.onTooltip?.('', '', s.px, s.py);
    return;
  }
  if (!(s.onSky && (s.hover || s.dipHover >= 0) && !s.focus)) {
    if (s.onSky && !s.focus) s.events.onTooltip?.('', '', s.px, s.py);
    return;
  }
  if (s.hover) {
    const l = LANES.find((l) => l.key === s.hover!.group);
    s.events.onTooltip?.(
      `${s.hover.code} ${s.hover.title}`,
      `${l?.name || s.hover.group} · 点击看详情 · 可拖动`,
      s.px,
      s.py,
    );
    return;
  }
  const d = DIPPER[s.dipHover],
    g = FIG_LANE[s.dipHover],
    lane = LANES.find((l) => l.key === g),
    total = [...s.counts.values()].reduce((a, b) => a + b, 0);
  s.events.onTooltip?.(
    s.dipHover === 7 ? '北辰 · 总览' : `${d!.gr} ${d!.zh} · ${lane?.name || '正式 App'}`,
    s.dipHover === 7
      ? `六组任务共 ${total} 项 · 点击看全局`
      : lane
        ? `${s.laneCount(g)} 项 · 点击看这一组`
        : `${s.board.appVersion || ''} · 点击看版本`,
    s.px,
    s.py,
  );
}
