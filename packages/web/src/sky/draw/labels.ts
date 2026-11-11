import { FIG_LANE as CARD_LANE, COL, DIPPER, GOLD, LANES, LATIN } from '../../domain/lanes';
import { SMALL_LABEL } from '../constants';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawHubLabels(state: SkyState) {
  const big = Math.max(10, state.unit * 0.0115) * state.sz,
    small = Math.max(10, state.unit * 0.011) * state.sz;
  const total = [...state.counts.values()].reduce((a, b) => a + b, 0),
    done = state.laneCount('done');
  state.ctx.textAlign = 'center';
  state.dipPos.forEach(([x, y], k) => {
    let l1,
      l2,
      c,
      y0,
      on = state.sky || k === state.dipLit || k === state.dipSel || k === state.dipHover;
    if (k === 7) {
      l1 = `北辰 · ALL ${total}`;
      l2 = `总览 · 完成 ${total ? Math.round((done / total) * 100) : 0}%`;
      c = GOLD;
      y0 = y + 50 * state.sz;
    } else if (k === 0) {
      const nx =
        state.board?.app?.next ||
        (state.board?.nextRelease ? String(state.board.nextRelease).split(/[:：（(，,\s]/)[0]! : '');
      l1 = `α 天枢 · BUILD ${state.board?.app?.version || state.board?.appVersion || '—'}`;
      l2 = '正式 App' + (nx ? ` · 下个 ${nx}` : '') + (state.unvN ? ` · 待实证 ${state.unvN}` : '');
      c = COL.doing;
      y0 = y + 34 * state.sz;
    } else {
      const g = CARD_LANE[k]!,
        n = state.laneCount(g),
        [zx, zy, R] = state.centre(g),
        lane = LANES.find((l) => l.key === g);
      l1 = `${DIPPER[k]!.gr} ${DIPPER[k]!.zh} · ${LATIN[g]!} ${n}`;
      l2 =
        (lane ? lane.name : g) +
        (n ? '' : ' · 暂无') +
        (g === 'done' && n > 12 && state.sky && state.cam.s < 1.4 ? ' · 放大看连线' : '');
      c = COL[g]! || COL.planned;
      y0 = state.at(zx, zy + (n ? R * 0.85 + 22 * state.sz : 50 * state.sz), 14)[1]!;
      on = on || state.litGroup === g || !!(state.hover && state.hover.group === g);
    }
    let lx = x;
    if (state.ZONE.dip) {
      // Small header Dipper: just the star's name, placed so neighbours never collide (fades out as the sky view opens).
      const me = k === state.dipLit || (state.dipLit < 0 && k === state.dipPin) || k === state.dipSel;
      if (state.skyK < 0.98 && k === 7 && state.smallBox) {
        // Polaris's name under its emblem, and the system's name under the Dipper.
        const Sp = state.sz * (0.55 + 0.45 * state.skyK) * 2.3;
        state.ctx.globalAlpha = 1 - state.skyK;
        state.ctx.textAlign = 'center';
        state.ctx.font = `600 15px "Noto Sans SC", sans-serif`;
        state.ctx.fillStyle = rgba(GOLD, 0.8);
        state.ctx.fillText('北辰', x, y + 26 * Sp + 4);
        // The chosen system's constellation name sits just under the bowl's bottom edge (Phecda–Merak).
        const [gx, gy] = state.dipPos[2]!,
          [bx3, by3] = state.dipPos[1]!,
          cs = state.systems().find((x) => x.key === state.sysSel) || state.systems()[0]!;
        state.ctx.fillStyle = rgba([46, 230, 255], 0.9);
        state.ctx.fillText(
          state.sysSel === 'all' ? '全部系统' : cs.constellation || '北斗',
          (gx + bx3) / 2,
          Math.max(gy, by3) + 26,
        );
        state.ctx.globalAlpha = 1;
      } else if (state.skyK < 0.98 && k !== 7) {
        const [dx, dy, al] = SMALL_LABEL[k]!;
        state.ctx.globalAlpha = 1 - state.skyK;
        state.ctx.textAlign = al;
        state.ctx.font = `${me ? 600 : 500} ${me ? 12 : 11}px "Noto Sans SC", sans-serif`;
        state.ctx.shadowColor = 'rgba(4,10,20,.95)';
        state.ctx.shadowBlur = 5; // a dark halo keeps names readable where they cross a line
        state.ctx.fillStyle = me ? rgba(state.OWN(k), 1) : rgba(GOLD, 0.36 + 0.12 * state.dipGlow);
        const wide =
          Math.max(...state.dipPos.slice(0, 7).map((q) => q[0]!)) -
            Math.min(...state.dipPos.slice(0, 7).map((q) => q[0]!)) >
          230; // narrow figure: drop the Greek letter
        state.ctx.fillText(wide ? `${DIPPER[k]!.gr} ${DIPPER[k]!.zh}` : DIPPER[k]!.zh, x + dx, y + dy);
        state.ctx.shadowBlur = 0;
        state.ctx.globalAlpha = 1;
      }
      if (state.skyK < 0.02) return;
      // Sky view: the full catalogue entry beside its star (-1 left, 1 right, 0 below, 2 above).
      const sd = state.ZONE.side[k]!,
        gap = (k === 7 ? 44 : 20) * state.sz;
      state.ctx.textAlign = sd === -1 ? 'right' : sd === 1 ? 'left' : 'center';
      lx = sd === -1 || sd === 1 ? x + sd * gap : x;
      y0 = sd === 0 ? y + 30 * state.sz : sd === 2 ? y - 34 * state.sz : y - 2 * state.sz;
      state.ctx.globalAlpha = state.skyK;
    } else if (!state.sky && state.toScreen(lx, y0)[1]! < 150) return; // behind the page header the label would clash with its text and buttons
    state.ctx.font = `600 ${big}px "JetBrains Mono", "Noto Sans SC", monospace`;
    state.ctx.fillStyle = rgba(c, on ? 0.95 : 0.55);
    state.ctx.fillText(l1, lx, y0);
    state.ctx.font = `500 ${small}px "Noto Sans SC", sans-serif`;
    state.ctx.fillStyle = rgba([200, 220, 245], on ? 0.6 : 0.35);
    state.ctx.fillText(l2, lx, y0 + 15 * state.sz);
    state.ctx.globalAlpha = 1;
  });
  state.ctx.textAlign = 'start';
}
