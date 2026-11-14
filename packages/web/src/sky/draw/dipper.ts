import { FIG_LANE as CARD_LANE, COL, DIPPER_LINES, GOLD } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState } from '../types';
import { drawHub } from './hub';
import { clusterTether, hubDraggable } from '../motion/constellation';

/** Sky-view Dipper line: brighter and thicker than any task constellation line (see TASK_LINK_SKY). */
export const DIPPER_SKY = { width: 2.2, alpha: 0.78, glowWidth: 9, glowAlpha: 0.11 };

export function drawDipper(state: SkyState, t: number) {
  const pos = state.hubs(),
    lit =
      state.dipLit >= 0
        ? state.dipLit
        : state.dipPin >= 0
          ? state.dipPin
          : state.dipSel >= 0
            ? state.dipSel
            : state.dipHover;
  state.dipPos = pos;
  state.dipGlow += ((lit >= 0 ? 1 : 0) - state.dipGlow) * 0.08;
  // On the board (wide screens) the small header Dipper is drawn crisp and bright with solid lines; decorations
  // shrink with it (S). In the sky view it returns to the full-size, dashed, animated figure.
  const small = !!state.ZONE.dip && state.skyK < 0.5,
    vis = state.sky || !!state.ZONE.dip,
    S0 = state.sz * (state.ZONE.dip ? 0.55 + 0.45 * state.skyK : 1);
  // The Dipper's figure, star to star, with light creeping along it; the pointer line runs from Dubhe to Polaris.
  // In the sky view the Dipper is the brightest figure on the chart, a step above every task constellation.
  state.ctx.lineCap = 'round';
  state.ctx.lineWidth = small ? 4 : state.sky ? DIPPER_SKY.glowWidth : 6;
  state.ctx.strokeStyle = rgba(GOLD, small ? 0.025 + 0.04 * state.dipGlow : state.sky ? DIPPER_SKY.glowAlpha : 0.025);
  state.ctx.beginPath();
  for (const [a, b] of DIPPER_LINES) {
    state.ctx.moveTo(...pos[a]!);
    state.ctx.lineTo(...pos[b]!);
  }
  state.ctx.stroke();
  state.ctx.lineCap = 'butt';
  state.ctx.setLineDash(small ? [] : state.sky ? [7, 4] : [4, 6]);
  state.ctx.lineDashOffset = state.reduce.matches ? 0 : -t / 120;
  state.ctx.lineWidth = small ? 1.1 : state.sky ? DIPPER_SKY.width : 1.3;
  // Quiet by default on the board; a hovered or clicked figure card lifts the whole figure and lights its star's edges.
  state.ctx.strokeStyle = rgba(
    GOLD,
    (small ? 0.14 + 0.14 * state.dipGlow : state.sky ? DIPPER_SKY.alpha : 0.14) + (small ? 0 : state.dipGlow * 0.15),
  );
  state.ctx.beginPath();
  for (const [a, b] of DIPPER_LINES) {
    state.ctx.moveTo(...pos[a]!);
    state.ctx.lineTo(...pos[b]!);
  }
  state.ctx.stroke();
  if (small && lit >= 0 && lit < 7) {
    state.ctx.lineWidth = 1.6;
    state.ctx.strokeStyle = rgba(state.OWN(lit), 0.85 * state.dipGlow);
    state.ctx.beginPath();
    for (const [a, b] of DIPPER_LINES)
      if (a === lit || b === lit) {
        state.ctx.moveTo(...pos[a]!);
        state.ctx.lineTo(...pos[b]!);
      }
    state.ctx.stroke();
  }
  state.ctx.setLineDash([3, 4]);
  state.ctx.lineWidth = 1;
  state.ctx.strokeStyle = rgba(GOLD, state.ZONE.dip ? 0.3 * state.skyK : vis ? 0.3 : 0.08);
  state.ctx.beginPath();
  state.ctx.moveTo(...pos[0]!);
  state.ctx.lineTo(...pos[7]!);
  state.ctx.stroke();
  state.ctx.setLineDash([]);
  state.ctx.lineDashOffset = 0;
  // Tethers: a dotted line from each Dipper star to the task star nearest its cluster's live centre, as drawn this
  // frame, ending at that star's halo with a small node so it reads as connected.
  if (state.ZONE.dip && state.skyK > 0.05) {
    state.ctx.setLineDash([2, 4]);
    state.ctx.lineWidth = 1.2;
    for (let k = 1; k < 7; k++) {
      const g = CARD_LANE[k]!;
      if (!state.laneCount(g)) continue;
      const hit = clusterTether(state, k, pos[k]!, hubDraggable(state));
      if (!hit) continue;
      const end = hit.end;
      const c = COL[g]! || COL.planned,
        a = Math.min(1, 0.55 * state.skyK * (k === lit ? 1.5 : 1));
      state.ctx.strokeStyle = rgba(c, a);
      state.ctx.beginPath();
      state.ctx.moveTo(...pos[k]!);
      state.ctx.lineTo(...end);
      state.ctx.stroke();
      state.ctx.fillStyle = rgba(c, a);
      state.ctx.beginPath();
      state.ctx.arc(end[0], end[1], 1.6 * state.sz, 0, 6.2832);
      state.ctx.fill();
    }
    state.ctx.setLineDash([]);
  }
  // Orbits round Polaris in the header: dotted ellipses reaching out past the Dipper system, a small body travelling the outer one.
  if (state.ZONE.dip && state.smallBox && state.skyK < 0.98) {
    const [ox, oy] = pos[7]!,
      far = Math.max(60, Math.max(...pos.slice(0, 7).map((q) => q[0]!)) - ox + 40),
      al = 1 - state.skyK,
      still = state.reduce.matches;
    [1, 0.68, 0.4].forEach((f, i) => {
      const rx = far * f,
        ry = rx * 0.27;
      state.ctx.setLineDash(i ? [1.5, 6] : [2, 7]);
      state.ctx.lineDashOffset = still ? 0 : ((i % 2 ? 1 : -1) * t) / (90 + i * 40);
      state.ctx.strokeStyle = rgba(i ? [140, 190, 255] : GOLD, (0.34 - i * 0.07) * al);
      state.ctx.lineWidth = 1;
      state.ctx.beginPath();
      state.ctx.ellipse(ox, oy, rx, ry, -0.06, 0, 6.2832);
      state.ctx.stroke();
    });
    state.ctx.setLineDash([]);
    state.ctx.lineDashOffset = 0;
    if (!still) {
      const a = t / 9000,
        rx = far,
        ry = rx * 0.27,
        c0 = Math.cos(-0.06),
        s0 = Math.sin(-0.06),
        ex = Math.cos(a) * rx,
        ey = Math.sin(a) * ry;
      state.ctx.globalAlpha = 0.8 * al;
      state.ctx.drawImage(state.tint([170, 220, 255]), ox + ex * c0 - ey * s0 - 5, oy + ex * s0 + ey * c0 - 5, 10, 10);
      state.ctx.globalAlpha = 1;
    }
  }
  pos.forEach(([x, y], k) => drawHub(state, x, y, k, t, lit, small, vis, S0));
}
