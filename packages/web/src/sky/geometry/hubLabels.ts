import { FIG_LANE, COL, DIPPER, GOLD, LANES } from '../../domain/lanes';
import type { Box, Point, SkyState } from '../types';
/** Record the actual rendered text ink bounds rather than guessing label widths from character counts. */
export function textBox(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): Box {
  const m = ctx.measureText(text),
    shift = ctx.textAlign === 'center' ? m.width / 2 : ctx.textAlign === 'right' ? m.width : 0;
  return [
    Math.min(x - shift, x - (m.actualBoundingBoxLeft ?? shift)) - 4,
    y - (m.actualBoundingBoxAscent || 14) - 4,
    Math.max(x - shift + m.width, x + (m.actualBoundingBoxRight ?? m.width - shift)) + 4,
    y + (m.actualBoundingBoxDescent || 4) + 4,
  ];
}

/** One line in Chinese first: `<Greek> <star> · <group> <count>`; the optional second line is a small supplement. */
export function hubCaption(s: SkyState, k: number) {
  const total = [...s.counts.values()].reduce((a, b) => a + b, 0);
  if (k === 7)
    return {
      l1: `北辰 · 全部 ${total} · 完成 ${total ? Math.round((s.laneCount('done') / total) * 100) : 0}%`,
      l2: '',
      c: GOLD,
    };
  if (k === 0) {
    const nx =
      s.board?.app?.next || (s.board?.nextRelease ? String(s.board.nextRelease).split(/[:：（(，,\s]/)[0]! : '');
    return {
      l1: `${DIPPER[0]!.gr} ${DIPPER[0]!.zh} · 正式 App ${s.board?.app?.version || s.board?.appVersion || '—'}`,
      l2: [nx ? `下个 ${nx}` : '', s.unvN ? `待实证 ${s.unvN}` : ''].filter(Boolean).join(' · '),
      c: COL.doing,
    };
  }
  const g = FIG_LANE[k]!,
    n = s.laneCount(g),
    lane = LANES.find((l) => l.key === g);
  return {
    l1: `${DIPPER[k]!.gr} ${DIPPER[k]!.zh} · ${lane ? lane.name : g} ${n}`,
    l2: g === 'done' && n > 12 && s.sky && s.cam.s < 1.4 ? '放大看连线' : '',
    c: COL[g],
  };
}

export const hubFonts = (s: SkyState, sz: number) => {
  const big = Math.max(10, s.unit * 0.0115) * sz,
    small = Math.max(10, s.unit * 0.011) * sz;
  return {
    big,
    small,
    l1: `600 ${big}px "JetBrains Mono", "Noto Sans SC", monospace`,
    l2: `500 ${small}px "Noto Sans SC", sans-serif`,
    /** Baseline distance from the caption to its supplement, scaled with both font sizes so they never overlap. */
    gap: big * 0.3 + small * 1.15,
  };
};

export function hubLabelAnchor(s: SkyState, k: number, [x, y]: Point, sz: number) {
  if (s.ZONE.dip) {
    const side = s.ZONE.side[k]!,
      gap = (k === 7 ? 44 : 25) * sz; // clear of the Dipper star's longer sky-view spikes
    return {
      x: side === -1 || side === 1 ? x + side * gap : x,
      y: side === 0 ? y + 30 * sz : side === 2 ? y - 34 * sz : y - 2 * sz,
      align: (side === -1 ? 'right' : side === 1 ? 'left' : 'center') as CanvasTextAlign,
    };
  }
  const g = FIG_LANE[k],
    n = s.laneCount(g),
    [cx, cy, r] = g ? s.centre(g) : [x, y, 0];
  return {
    x,
    y: k === 7 ? y + 50 * sz : k === 0 ? y + 34 * sz : s.at(cx, cy + (n ? r * 0.85 + 22 * sz : 50 * sz), 14)[1],
    align: 'center' as CanvasTextAlign,
  };
}

/** Measure with the rendering fonts at the requested zoom, independent of the last painted frame. */
export function measureHubLabels(s: SkyState, points = s.hubs(), scale = s.cam.s) {
  const sz = scale ** -0.6,
    ctx = s.ctx,
    f = hubFonts(s, sz);
  ctx.save();
  const boxes = points.map((p, k) => {
    const { l1, l2 } = hubCaption(s, k),
      { x, y, align } = hubLabelAnchor(s, k, p, sz);
    ctx.textAlign = align;
    ctx.font = f.l1;
    const first = textBox(ctx, l1, x, y);
    if (!l2) return [first];
    ctx.font = f.l2;
    return [first, textBox(ctx, l2, x, y + f.gap)];
  });
  ctx.restore();
  return boxes;
}
