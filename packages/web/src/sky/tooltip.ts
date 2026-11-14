import { RELEASE_TAG_LABELS, releaseSummary } from '@polaris/core';
import { fmt } from '../domain/time';
import { DIPPER, FIG_LANE, LANES } from '../domain/lanes';
import { cameraMoving } from './motion/cameraMotion';
import type { SkyState } from './types';
/** Require a fresh hover after selection, dragging or camera navigation. */
export function clearTooltip(s: SkyState) {
  s.tooltipGate = { x: s.px, y: s.py, id: s.hoverRelease?.release.version ?? s.hover?.id ?? null };
  s.events.onTooltip?.('', '', s.px, s.py);
}
export function tooltipAllowed(s: SkyState): boolean {
  if (s.drag) return false;
  if (s.tooltipSettling) {
    const moving = [
      ...s.stars.values(),
      ...s.hubParticles,
      ...(s.aquarius?.stars.flatMap((star) => [star.particle, ...star.satelliteParticles]) ?? []),
    ].some((p) => Math.hypot(p.ox, p.oy) > 0.5 || Math.hypot(p.vx, p.vy) > 4);
    if (moving) return false;
    s.tooltipSettling = false;
    s.tooltipGate = null;
  }
  const gate = s.tooltipGate;
  const moved = !gate || s.px !== gate.x || s.py !== gate.y;
  return !!(
    s.onSky &&
    !s.drag &&
    !s.focus &&
    !cameraMoving(s) &&
    Math.abs(s.cam.s - s.camT.s) < 0.001 &&
    Math.hypot(s.cam.x - s.camT.x, s.cam.y - s.camT.y) < 0.5 &&
    (!s.selected || s.hoverRelease || (s.hover && s.hover.id !== s.selected)) &&
    (!gate || (moved && (s.hoverRelease?.release.version ?? s.hover?.id) !== gate.id))
  );
}
export function emitTooltip(s: SkyState) {
  s.events.onCursor?.(
    s.drag ? 'grabbing' : s.hoverRelease || s.hover || s.dipHover >= 0 ? 'pointer' : s.sky && s.onSky ? 'grab' : '',
  );
  if (!tooltipAllowed(s)) {
    s.events.onTooltip?.('', '', s.px, s.py);
    return;
  }
  s.tooltipGate = null;
  if (s.hoverRelease) {
    const r = s.hoverRelease.release;
    s.events.onTooltip?.(
      `${r.version}${r.tag ? ' · ' + RELEASE_TAG_LABELS[r.tag] : ''} · ${fmt(r.releasedAt)}`,
      `${releaseSummary(r) || '（未填写简介）'}\n交付 ${r.items?.length ?? r.stats?.items ?? 0} 项 · 点击查看发布记录`,
      s.px,
      s.py,
    );
    return;
  }
  if (!s.hover && s.dipHover < 0) {
    s.events.onTooltip?.('', '', s.px, s.py);
    return;
  }
  if (s.hover) {
    const l = LANES.find((l) => l.key === s.hover!.group);
    s.events.onTooltip?.(
      `${s.sky ? s.hover.skyCode || s.hover.code : s.hover.code} ${s.hover.title}`,
      `${l?.name || s.hover.group} · 点击看详情 · 可拖动${s.hover.chainLabel ? `\n${s.hover.chainLabel}` : ''}`,
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
