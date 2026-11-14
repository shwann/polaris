import { captionFit, hubCaption, hubFonts, hubLabelAnchor } from '../geometry/hubLabels';
import { FIG_LANE as CARD_LANE, DIPPER, GOLD } from '../../domain/lanes';
import { textBox } from '../geometry/hubObstacles';
import { domBoxes, labelFits, outlinedText, starHalos } from './labelObstacles';
import { SMALL_LABEL } from '../constants';
import { rgba } from '../palette';
import type { Box, Color, SkyState } from '../types';

/** Sky-coloured, half see-through plate under a caption that cannot avoid a Dipper line. */
export const HUB_BACKDROP = 'rgba(4,10,20,0.72)';
export interface HubLine {
  text: string;
  font: string;
  x: number;
  y: number;
  box: Box;
  color: Color;
  alpha: number;
}
export interface HubLabel {
  k: number;
  align: CanvasTextAlign;
  alpha: number;
  lines: HubLine[];
  /** No side clears the Dipper lines: paint a plate the colour of the sky under the text. */
  backdrop?: boolean;
}

/** Small header Dipper: just the star's name, placed so neighbours never collide (fades out as the sky view opens). */
function drawHeaderName(state: SkyState, k: number, x: number, y: number) {
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
}

/**
 * Dipper captions are laid out first and have the highest label priority: their boxes are obstacles every task
 * label must avoid. In the wide sky view they are painted after the task stars, so no halo ever covers them.
 */
export function drawHubLabels(state: SkyState) {
  const f = hubFonts(state, state.sz),
    deferred = state.sky && state.w > 560,
    queue: HubLabel[] = [],
    // In the wide sky view a caption also moves off task stars, keeping about one label height clear of them.
    crowd = deferred
      ? {
          stars: [...state.stars.values()]
            .filter((s) => !s.dead && s.group !== 'done' && s.alpha > 0.02)
            .map((s) => state.at(s.x, s.y, 14)),
          keep: f.big * 1.2,
        }
      : {};
  state.hubSides ??= [];
  state.ctx.textAlign = 'center';
  state.dipPos.forEach(([x, y], k) => {
    const { l1, l2, c } = hubCaption(state, k),
      anchor = hubLabelAnchor(state, k, [x, y], state.sz, {
        ...captionFit(state.ctx, f, state.dipPos, l1, l2),
        ...crowd,
        last: deferred ? state.hubSides![k] : undefined,
      }),
      g = CARD_LANE[k];
    const on =
      state.sky ||
      k === state.dipLit ||
      k === state.dipSel ||
      k === state.dipHover ||
      (!!g && (state.litGroup === g || state.hover?.group === g));
    state.hubSides![k] = anchor.side;
    let alpha = 1;
    if (state.ZONE.dip) {
      drawHeaderName(state, k, x, y);
      if (state.skyK < 0.02) return;
      alpha = state.skyK;
    } else if (!state.sky && state.toScreen(x, anchor.y)[1]! < 150) return; // behind the page header the label would clash with its text and buttons
    state.ctx.textAlign = anchor.align;
    state.ctx.font = f.l1;
    const lines: HubLine[] = [
      {
        text: l1,
        font: f.l1,
        x: anchor.x,
        y: anchor.y,
        box: textBox(state.ctx, l1, anchor.x, anchor.y),
        color: c,
        alpha: on ? 0.95 : 0.55,
      },
    ];
    if (l2) {
      state.ctx.font = f.l2;
      const y2 = anchor.y + f.gap;
      lines.push({
        text: l2,
        font: f.l2,
        x: anchor.x,
        y: y2,
        box: textBox(state.ctx, l2, anchor.x, y2),
        color: [200, 220, 245],
        alpha: on ? 0.6 : 0.35,
      });
    }
    queue.push({ k, align: anchor.align, alpha, lines, backdrop: anchor.backdrop });
  });
  if (deferred) dropCrowdedSupplements(state, queue);
  state.hubLabelBoxes = [];
  for (const label of queue) state.hubLabelBoxes[label.k] = label.lines.map((l) => l.box);
  state.hubLabelQueue = queue;
  if (!deferred) paintHubLabels(state);
  state.ctx.textAlign = 'start';
}

/** A supplement line shows only where it has room: clear of other captions, panels and bright star cores. */
export function dropCrowdedSupplements(state: SkyState, queue: HubLabel[]) {
  const panels = domBoxes(state),
    halos = starHalos(state);
  for (const label of queue) {
    if (label.lines.length < 2) continue;
    const others = queue.flatMap((o) => (o === label ? [] : o.lines.map((l) => l.box)));
    if (!labelFits(label.lines[1]!.box, [...others, ...panels], halos)) label.lines.length = 1;
  }
}

export function paintHubLabels(state: SkyState) {
  const queue = state.hubLabelQueue || [],
    outlined = state.sky && state.w > 560;
  for (const label of queue) {
    state.ctx.globalAlpha = label.alpha;
    if (label.backdrop) {
      const b = label.lines.reduce<Box>(
        (u, l) => [
          Math.min(u[0], l.box[0]),
          Math.min(u[1], l.box[1]),
          Math.max(u[2], l.box[2]),
          Math.max(u[3], l.box[3]),
        ],
        [...label.lines[0]!.box],
      );
      state.ctx.fillStyle = HUB_BACKDROP;
      state.ctx.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    }
    state.ctx.textAlign = label.align;
    for (const line of label.lines) {
      state.ctx.font = line.font;
      state.ctx.fillStyle = rgba(line.color, outlined ? 1 : line.alpha);
      if (outlined) outlinedText(state.ctx, line.text, line.x, line.y, 1, line.alpha);
      else state.ctx.fillText(line.text, line.x, line.y);
    }
  }
  state.ctx.globalAlpha = 1;
  state.ctx.textAlign = 'start';
  state.hubLabelQueue = [];
}
