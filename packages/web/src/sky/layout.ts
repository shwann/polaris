import { DIPPER, FIG_LANE } from '../domain/lanes';
import { TALL, WIDE, anchor } from './constants';
import { BIG, SMALL, fit } from './geometry/dipper';
import { hash } from './palette';
import type { Box, Point, SkyState } from './types';
export function measureHeader(s: SkyState) {
  const r = s.registry,
    cov = r.get('cover'),
    c = r.get('clock'),
    rw = r.get('actions'),
    sr = r.get('status'),
    pr = r.get('watch'),
    tabs = r.get('tabs'),
    fig = r.get('figures');
  if (!cov || !c || !rw || !sr || !pr || !tabs || !fig) {
    s.smallBox = null;
    return;
  }
  let tr = 0;
  for (const k of ['kicker', 'en', 'zh', 'motto', 'ticker'] as const) tr = Math.max(tr, r.get(k)?.right || 0);
  const Y = scrollY,
    top = Math.max(6, cov.top - 18) + 10,
    right = Math.min(c.left, sr.left, pr.left) - 24,
    bottom = tabs.top - 10;
  s.veilY = fig.bottom + 20 + Y;
  if (right - tr < 300 || bottom - top < 110) {
    s.smallBox = null;
    return;
  }
  const x0 = tr + 24,
    bw = right - x0,
    px = x0 + Math.min(Math.max(bw * 0.2, 64), 210),
    py = top + (bottom - top) * 0.46;
  s.smallBox = [px + Math.min(120, bw * 0.17), top + 14 + Y, right - 54, bottom - 26 + Y];
  s.smallPole = [px, py + Y];
}
export function hubs(s: SkyState): Point[] {
  if (!s.ZONE.dip)
    return [
      ...DIPPER.map((_, k) => (k ? s.centre(FIG_LANE[k]!) : anchor(s.ZONE.app, 110, 80, s.w, s.h))),
      anchor(s.ZONE.pole, 120, 70, s.w, s.h),
    ].map(([x, y]) => s.at(x, y, 14));
  const big = fit([0.06 * s.w, 0.1 * s.h, 0.86 * s.w, 0.86 * s.h]),
    e = s.skyK * s.skyK * (3 - 2 * s.skyK);
  const b = s.smallBox,
    p = s.smallPole;
  const small =
    b && p ? [...fit([b[0], b[1] - scrollY, b[2], b[3] - scrollY], 360, SMALL), [p[0], p[1] - scrollY] as Point] : big;
  return big.map(([bx, by], i) =>
    s.at(small[i]![0] + (bx - small[i]![0]) * e, small[i]![1] + (by - small[i]![1]) * e, 14 * e),
  );
}
export function size(s: SkyState) {
  s.dpr = Math.min(2, devicePixelRatio || 1);
  s.w = innerWidth;
  s.h = innerHeight;
  s.unit = Math.min(s.w, s.h * 1.4);
  s.ZONE = s.h > s.w * 1.15 ? TALL : WIDE;
  s.cvs.width = Math.round(s.w * s.dpr);
  s.cvs.height = Math.round(s.h * s.dpr);
  s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  s.dust = Array.from({ length: Math.round(Math.min(220, (s.w * s.h) / 6000)) }, (_, i) => ({
    x: hash('d' + i, 1) * s.w,
    y: hash('d' + i, 2) * s.h,
    m: hash('d' + i, 3),
    ph: hash('d' + i, 4) * 6.28,
  }));
  if (s.ZONE.dip) {
    const p = fit([0.06 * s.w, 0.1 * s.h, 0.86 * s.w, 0.86 * s.h], 1e9, BIG),
      q = p.slice(0, 4),
      xs = q.map((v) => v[0]),
      ys = q.map((v) => v[1]);
    s.bowl = [
      xs.reduce((a, b) => a + b) / 4,
      ys.reduce((a, b) => a + b) / 4,
      Math.min((Math.max(...xs) - Math.min(...xs)) / 2 / 1.25, (Math.max(...ys) - Math.min(...ys)) / 2 / 0.85) * 0.62,
    ];
  } else s.bowl = null;
  s.rebuild();
  if (s.w >= 2 && s.h >= 2) s.drawChart();
  s.measureHeader();
  for (const star of s.stars.values()) {
    [star.x, star.y] = s.home(star, s.reduce.matches ? 0 : performance.now());
    star.baseX = star.x;
    star.baseY = star.y;
    star.ox = star.oy = star.vx = star.vy = 0;
  }
}
export const topArea = (s: SkyState): Box => {
  const d = s.registry.get('dipcard'),
    y0 = d && s.dipSel >= 0 ? d.bottom + 24 : s.h * 0.12;
  return [s.w * 0.15, y0, s.w * 0.85, Math.max(y0 + 40, d && s.dipSel >= 0 ? s.h * 0.6 : s.h * 0.4)];
};
