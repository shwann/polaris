import { COL_APP } from '../../domain/lanes';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';

/** A small splash at the impact point, followed by concentric waves on the water surface. */
export function waterImpact(s: SkyState, [x, y]: Point, time: number, reach: number, fall = 0) {
  if (time < 0 || time >= fall + 2200) return;
  const c = s.ctx;
  c.save();
  c.setLineDash([]);
  // With a fall duration, the impact point is the water surface below the stream.
  if (time < fall) {
    const k = time / fall;
    c.fillStyle = rgba(COL_APP, 0.85 * s.skyK);
    c.beginPath();
    c.ellipse(x, y - 60 * s.sz * (1 - k * k), 2.4 * s.sz, 4.3 * s.sz, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return;
  }
  time -= fall;
  for (const delay of [0, 240, 480]) {
    const k = (time - delay) / 1700;
    if (k < 0 || k >= 1) continue;
    const radius = reach * (0.1 + 0.9 * k ** 0.8),
      alpha = (1 - k) ** 1.5 * s.skyK;
    c.lineWidth = 1.1 + 0.9 * (1 - k);
    c.strokeStyle = rgba(COL_APP, 0.85 * alpha);
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const angle = (i / 40) * 2 * Math.PI;
      const crest = radius * (1 + 0.05 * (1 - k) * Math.sin(angle * 5 - k * 12));
      const px = x + Math.cos(angle) * crest;
      const py = y + Math.sin(angle) * crest * 0.33;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.stroke();
  }
  const splash = time / 620;
  if (splash < 1) {
    c.fillStyle = rgba([205, 248, 255], (1 - splash) * s.skyK);
    for (const side of [-1, 0, 1]) {
      const height = Math.sin(Math.PI * splash) * reach * (side === 0 ? 0.55 : 0.35);
      c.beginPath();
      c.arc(x + side * reach * 0.45 * splash, y - height, (side === 0 ? 2 : 1.3) * s.sz, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}
