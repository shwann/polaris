import type { SkyState } from '../types';
import { constrain, panBounds } from './bounds';
import { coast } from './inertia';
import { spring } from './spring';

export function cameraBounds(s: SkyState, scale = s.camT.s) {
  // Home positions exclude temporary drag offsets, so pulling a star cannot move the boundary.
  const points = [...s.stars.values()]
    .filter((star) => !star.dead)
    .map((star) => s.at(star.baseX ?? star.x - star.ox, star.baseY ?? star.y - star.oy, 14));
  return panBounds([...points, ...s.hubs()], s.w, s.h, scale, s.w > 560);
}

export function stopCamera(s: SkyState) {
  s.inertia = [0, 0];
  s.returning = false;
}

export const cameraMoving = (s: SkyState) => s.returning || s.inertia.some((v) => v !== 0);

export function advanceCamera(s: SkyState, dt: number) {
  if (!s.sky || s.drag) return;
  const edge = constrain([s.camT.x, s.camT.y], cameraBounds(s));
  const outside = edge[0] !== s.camT.x || edge[1] !== s.camT.y;
  if (s.reduce.matches) {
    stopCamera(s);
    [s.camT.x, s.camT.y] = edge;
    return;
  }
  if (outside || s.returning) {
    s.returning = true;
    const x = spring(s.camT.x, s.inertia[0], edge[0], dt, 18, 1);
    const y = spring(s.camT.y, s.inertia[1], edge[1], dt, 18, 1);
    s.camT.x = x.x;
    s.camT.y = y.x;
    s.inertia = [x.v, y.v];
    if (Math.hypot(x.x - edge[0], y.x - edge[1]) < 0.25 && Math.hypot(x.v, y.v) < 4) {
      [s.camT.x, s.camT.y] = edge;
      stopCamera(s);
    }
  } else if (cameraMoving(s)) {
    const next = coast(s.inertia, dt);
    s.camT.x += next.delta[0];
    s.camT.y += next.delta[1];
    s.inertia = next.velocity;
  }
}
