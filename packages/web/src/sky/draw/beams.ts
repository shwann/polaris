import { COL, COL_APP, FIG_LANE } from '../../domain/lanes';
import { rgba } from '../palette';
import type { Color, SkyState } from '../types';
export function drawBeams(s: SkyState, t: number) {
  // While a card is open its star drives the links; after it closes they stay on the last star, slightly fainter.
  const sel = s.dipSel >= 1 ? s.dipSel : s.dipSel < 0 ? s.beamSel : -1,
    open = s.dipSel >= 1;
  if (sel < 1 || !s.dipIds || !s.dipPos[sel]) return;
  type End = [number, number, Color, number, boolean?];
  const ends: End[] =
    sel === 7
      ? s.dipPos.slice(0, 7).map(([x, y], k) => [x, y, k ? COL[FIG_LANE[k]!] : COL_APP, 1])
      : s.dipIds.flatMap((item) => {
          const o = typeof item === 'string' ? { id: item, dash: true } : item,
            star = s.stars.get(o.id);
          if (!star) return [];
          const [x, y] = s.at(star.x, star.y, 14);
          return [[x, y, COL[FIG_LANE[sel]!] || COL.doing, star.alpha, o.dash !== false] as End];
        });
  const [ox, oy] = s.dipPos[sel]!,
    al = Math.min(0.6, 1.8 / Math.sqrt(ends.length + 1)) * (open ? 1 : 0.7),
    ctx = s.ctx;
  ctx.lineDashOffset = -t / 45;
  ends.forEach(([x, y, c, alpha, dash = true], k) => {
    ctx.setLineDash(dash ? [3, 5] : []);
    const bx = (ox + x) / 2 + (y - oy) * 0.12,
      by = (oy + y) / 2 - (x - ox) * 0.12;
    ctx.strokeStyle = rgba(c, al * alpha);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(bx, by, x, y);
    ctx.stroke();
    const u = (t / 2200 + k * 0.137) % 1,
      v = 1 - u,
      qx = v * v * ox + 2 * v * u * bx + u * u * x,
      qy = v * v * oy + 2 * v * u * by + u * u * y;
    ctx.globalAlpha = Math.sin(Math.PI * u) * 0.9;
    ctx.drawImage(s.tint(c), qx - 5 * s.sz, qy - 5 * s.sz, 10 * s.sz, 10 * s.sz);
    ctx.globalAlpha = 1;
  });
  ctx.setLineDash([]);
  if (!open) return;
  ctx.strokeStyle = rgba([255, 214, 140], 0.7 + 0.2 * Math.sin(t / 300));
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(ox, oy, (11 + Math.sin(t / 260) * 2) * s.sz, 0, 6.2832);
  ctx.stroke();
}
