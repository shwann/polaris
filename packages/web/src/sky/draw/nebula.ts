import { DEPTH, NEB } from '../constants';
import { rgba } from '../palette';
import type { Color, SkyState } from '../types';
import { backgroundView, tileOrigins } from './background';

/** Cache the soft cloud profile; animation only changes its position and size. */
function cloud(s: SkyState, c: Color) {
  const key = 'nebula:' + c.join(',');
  let sprite = s.tints.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 128;
  const ctx = sprite.getContext('2d')!,
    g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(c, 0.065));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  s.tints.set(key, sprite);
  return sprite;
}

export function drawNebula(state: SkyState, t: number) {
  if (state.reduce.matches) t = 0;
  const view = backgroundView(state, DEPTH.nebula);
  state.ctx.globalCompositeOperation = 'lighter';
  for (const [dx, dy] of tileOrigins(view, state.w, state.h, state.unit * 0.5))
    for (const [fx, fy, c, sp] of NEB) {
      const x = (fx + Math.sin(t / (sp * 1000)) * 0.08) * state.w + dx,
        y = (fy + Math.cos(t / (sp * 1300)) * 0.06) * state.h + dy,
        r = state.unit * (0.36 + 0.05 * Math.sin(t / (sp * 700)));
      if (x + r < view[0] || y + r < view[1] || x - r > view[2] || y - r > view[3]) continue;
      state.ctx.drawImage(cloud(state, c), x - r, y - r, r * 2, r * 2);
    }
  state.ctx.globalCompositeOperation = 'source-over';
}
