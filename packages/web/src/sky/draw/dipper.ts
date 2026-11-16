import { FIG_LANE as CARD_LANE, COL, DIPPER_LINES, GOLD } from '../../domain/lanes';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';
import { drawHub } from './hub';
import { clusterTether, hubDraggable } from '../motion/constellation';
import { travelingGlow } from './travelingGlow';

/** Sky-view Dipper line: brighter and thicker than any task constellation line (see TASK_LINK_SKY). */
export const DIPPER_SKY = { width: 2.2, alpha: 0.78, glowWidth: 9, glowAlpha: 0.11 };

const INTRO_PATH = [6, 5, 4, 3, 2, 1, 0];
const INTRO_TRAVEL = 4000;
const INTRO_DURATION = 5000;

function drawDipperIntro(s: SkyState, pos: Point[], t: number) {
  if (s.dipperIntro === undefined) return;
  const elapsed = t - s.dipperIntro;
  if (!s.sky || s.reduce.matches || elapsed >= INTRO_DURATION) {
    s.dipperIntro = undefined;
    return;
  }
  if (elapsed <= 0) return;
  travelingGlow(
    s,
    INTRO_PATH.map((k) => pos[k]!),
    GOLD,
    Math.min(1, elapsed / INTRO_TRAVEL),
    {
      width: 3,
      trail: 0.2,
      opacity: 0.9 * Math.min(1, elapsed / 350, Math.max(0, 1 - (elapsed - INTRO_TRAVEL) / 300)),
    },
  );
  if (elapsed < INTRO_TRAVEL) return;
  const k = (elapsed - INTRO_TRAVEL) / (INTRO_DURATION - INTRO_TRAVEL),
    alpha = Math.sin(Math.PI * k) * s.skyK,
    [x, y] = pos[0]!,
    r = (24 + k * 9) * s.sz,
    c = s.ctx;
  c.save();
  c.globalAlpha = 0.66 * alpha;
  c.drawImage(s.tint(GOLD), x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1;
  c.fillStyle = rgba([255, 247, 215], 0.82 * alpha);
  c.beginPath();
  c.arc(x, y, 3.2 * s.sz, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

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
  // The two line styles crossfade as the stars move from the header to the sky positions.
  const small = !!state.ZONE.dip && state.skyK < 0.5,
    vis = state.sky || !!state.ZONE.dip,
    S0 = state.sz * (state.ZONE.dip ? 0.55 + 0.45 * state.skyK : 1),
    board = 1 - state.skyK,
    sky = state.skyK;
  // The Dipper's figure, star to star, with light creeping along it; the pointer line runs from Dubhe to Polaris.
  // In the sky view the Dipper is the brightest figure on the chart, a step above every task constellation.
  state.ctx.lineCap = 'round';
  state.ctx.lineWidth = (state.ZONE.dip ? 4 : 6) * board + DIPPER_SKY.glowWidth * sky;
  state.ctx.strokeStyle = rgba(
    GOLD,
    (0.025 + (state.ZONE.dip ? 0.04 * state.dipGlow : 0)) * board + DIPPER_SKY.glowAlpha * sky,
  );
  state.ctx.beginPath();
  for (const [a, b] of DIPPER_LINES) {
    state.ctx.moveTo(...pos[a]!);
    state.ctx.lineTo(...pos[b]!);
  }
  state.ctx.stroke();
  state.ctx.lineCap = 'butt';
  state.ctx.lineDashOffset = state.reduce.matches ? 0 : -t / 120;
  if (board > 0) {
    state.ctx.setLineDash(state.ZONE.dip ? [] : [4, 6]);
    state.ctx.lineWidth = state.ZONE.dip ? 1.1 : 1.3;
    state.ctx.strokeStyle = rgba(GOLD, (0.14 + (state.ZONE.dip ? 0.14 : 0.15) * state.dipGlow) * board);
    state.ctx.stroke();
  }
  if (sky > 0) {
    state.ctx.setLineDash([7, 4]);
    state.ctx.lineWidth = DIPPER_SKY.width;
    state.ctx.strokeStyle = rgba(GOLD, (DIPPER_SKY.alpha + state.dipGlow * 0.15) * sky);
    state.ctx.stroke();
  }
  if (state.ZONE.dip && board > 0 && lit >= 0 && lit < 7) {
    state.ctx.setLineDash([]);
    state.ctx.lineWidth = 1.6;
    state.ctx.strokeStyle = rgba(state.OWN(lit), 0.85 * state.dipGlow * board);
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
  drawDipperIntro(state, pos, t);
}
