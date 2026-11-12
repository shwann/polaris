import { FIG_LANE, COL, DIPPER, GOLD, LANES, LATIN } from '../../domain/lanes';
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

export function hubCaption(s: SkyState, k: number) {
  const total = [...s.counts.values()].reduce((a, b) => a + b, 0);
  if (k === 7)
    return {
      l1: `北辰 · ALL ${total}`,
      l2: `总览 · 完成 ${total ? Math.round((s.laneCount('done') / total) * 100) : 0}%`,
      c: GOLD,
    };
  if (k === 0) {
    const nx =
      s.board?.app?.next || (s.board?.nextRelease ? String(s.board.nextRelease).split(/[:：（(，,\s]/)[0]! : '');
    return {
      l1: `α 天枢 · BUILD ${s.board?.app?.version || s.board?.appVersion || '—'}`,
      l2: '正式 App' + (nx ? ` · 下个 ${nx}` : '') + (s.unvN ? ` · 待实证 ${s.unvN}` : ''),
      c: COL.doing,
    };
  }
  const g = FIG_LANE[k]!,
    n = s.laneCount(g),
    lane = LANES.find((l) => l.key === g);
  return {
    l1: `${DIPPER[k]!.gr} ${DIPPER[k]!.zh} · ${LATIN[g]} ${n}`,
    l2:
      (lane ? lane.name : g) +
      (n ? '' : ' · 暂无') +
      (g === 'done' && n > 12 && s.sky && s.cam.s < 1.4 ? ' · 放大看连线' : ''),
    c: COL[g],
  };
}

export function hubLabelAnchor(s: SkyState, k: number, [x, y]: Point, sz: number) {
  if (s.ZONE.dip) {
    const side = s.ZONE.side[k]!,
      gap = (k === 7 ? 44 : 20) * sz;
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
    ctx = s.ctx;
  ctx.save();
  const boxes = points.map((p, k) => {
    const { l1, l2 } = hubCaption(s, k),
      { x, y, align } = hubLabelAnchor(s, k, p, sz);
    ctx.textAlign = align;
    ctx.font = `600 ${Math.max(10, s.unit * 0.0115) * sz}px "JetBrains Mono", "Noto Sans SC", monospace`;
    const first = textBox(ctx, l1, x, y);
    ctx.font = `500 ${Math.max(10, s.unit * 0.011) * sz}px "Noto Sans SC", sans-serif`;
    return [first, textBox(ctx, l2, x, y + 15 * sz)];
  });
  ctx.restore();
  return boxes;
}
