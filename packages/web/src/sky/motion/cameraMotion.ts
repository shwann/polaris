import { aquariusParticles, releaseStars } from '../geometry/figures/aquarius';
import { measureHubLabels } from '../geometry/hubLabels';
import type { Box, Point, SkyState } from '../types';
import { constrain, panBounds, skyPanRoom, SOFT_PAN } from './bounds';
import { coast, LAUNCH_SPEED } from './inertia';
import { spring } from './spring';

export function cameraBounds(s: SkyState, scale = s.camT.s): Box {
  const room = s.sky ? skyPanRoom(scale) : 0,
    centreX = (s.w * (1 - scale)) / 2,
    centreY = (s.h * (1 - scale)) / 2;
  // At overview size, a viewport-based limit stays still while stars turn and labels move.
  const explore: Box = [centreX - s.w * room, centreY - s.h * room, centreX + s.w * room, centreY + s.h * room];
  if (room && scale >= 1 && scale <= 1.2) return explore;
  // Home positions exclude temporary drag offsets, so pulling a star cannot move the boundary.
  const points = [...s.stars.values()]
    .filter((star) => !star.dead)
    .map((star) => s.at(star.baseX ?? star.x - star.ox, star.baseY ?? star.y - star.oy, 14));
  releaseStars(s);
  if (s.aquarius) points.push(...aquariusParticles(s.aquarius).map((p) => s.at(p.baseX!, p.baseY!, 14)));
  const bar = s.registry.get('skybar'),
    bottomInset = bar && bar.height > 0 ? Math.max(0, s.h - bar.top) : 0;
  const hubs = s.hubs().map(([x, y], i): import('../types').Point => {
    const p = s.sky && s.w > 560 && !s.reduce.matches ? s.hubParticles[i] : undefined;
    return [x - (p?.ox || 0), y - (p?.oy || 0)];
  });
  const labels =
    s.sky && s.w > 560
      ? measureHubLabels(s, hubs, scale)
          .flat()
          .flatMap(
            (b) =>
              [
                [b[0], b[1]],
                [b[2], b[3]],
              ] as import('../types').Point[],
          )
      : [];
  const [x0, y0, x1, y1] = panBounds([...points, ...hubs, ...labels], s.w, s.h, scale, s.w > 560, bottomInset);
  if (!room) return [x0, y0, x1, y1];
  return [Math.min(x0, explore[0]), Math.min(y0, explore[1]), Math.max(x1, explore[2]), Math.max(y1, explore[3])];
}

export function stopCamera(s: SkyState) {
  s.inertia = [0, 0];
  s.returning = false;
  s.cameraTravelBounds = undefined;
}

export const cameraMoving = (s: SkyState) => s.returning || s.inertia.some((v) => v !== 0);

export function advanceCamera(s: SkyState, dt: number) {
  if (!s.sky || s.drag) return;
  const bounds = s.cameraTravelBounds ?? cameraBounds(s);
  const edge = constrain([s.camT.x, s.camT.y], bounds);
  const outside = edge[0] !== s.camT.x || edge[1] !== s.camT.y;
  if (s.reduce.matches) {
    stopCamera(s);
    [s.camT.x, s.camT.y] = edge;
    return;
  }
  if (!outside && !cameraMoving(s)) return;
  const next = coast(s.inertia, dt);
  const axis = (position: number, limit: number, i: 0 | 1) => {
    if (position === limit) {
      const x = position + next.delta[i];
      return { x: Math.max(bounds[i] - SOFT_PAN, Math.min(bounds[i + 2]! + SOFT_PAN, x)), v: next.velocity[i] };
    }
    const { x, v } = spring(position, s.inertia[i], limit, dt, 14, 1);
    if ((x - limit) * (position - limit) <= 0 || (Math.abs(x - limit) < 0.25 && Math.abs(v) < 4)) {
      return { x: limit, v: 0 };
    }
    return { x: Math.max(limit - SOFT_PAN, Math.min(limit + SOFT_PAN, x)), v };
  };
  const x = axis(s.camT.x, edge[0], 0),
    y = axis(s.camT.y, edge[1], 1);
  [s.camT.x, s.camT.y] = [x.x, y.x];
  s.inertia = [x.v, y.v];
  const [left, top, right, bottom] = bounds;
  s.returning = x.x < left || x.x > right || y.x < top || y.x > bottom;
  if (!cameraMoving(s)) stopCamera(s);
}

export function launchCamera(s: SkyState, direction: Point) {
  const speed = Math.hypot(...direction);
  if (speed <= LAUNCH_SPEED) return;
  const gain = Math.min(0.85, 1800 / speed);
  s.inertia = [direction[0] * gain, direction[1] * gain];
}
