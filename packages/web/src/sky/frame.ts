import { FIG_LANE as CARD_LANE } from '../domain/lanes';
import { drawBackgroundChart } from './draw/background';
import { layerScale } from './draw/chartGeometry';
import { DEPTH } from './constants';
import { advanceCamera, cameraMoving } from './motion/cameraMotion';
import { drawDust } from './draw/dust';
import type { SkyState } from './types';

export function frame(state: SkyState, t: number) {
  const dt = Math.max(0, state.last ? t - state.last : 16);
  state.last = t;
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.ctx.clearRect(0, 0, state.w, state.h);
  if (state.w < 2 || state.h < 2) return; // Wait until layout gives the canvas room.
  const moving = cameraMoving(state);
  advanceCamera(state, dt);
  if (!state.drag && !moving && !cameraMoving(state)) {
    if (state.px > -1e3 && !state.reduce.matches) {
      state.tx = (state.px / state.w - 0.5) * -1;
      state.ty = (state.py / state.h - 0.5) * -1;
    }
    const ease = 1 - Math.exp(-dt / 312);
    state.mx += (state.tx - state.mx) * ease;
    state.my += (state.ty - state.my) * ease;
  }
  if (state.drag?.moved || moving || cameraMoving(state) || state.reduce.matches) Object.assign(state.cam, state.camT);
  else {
    const ease = 1 - Math.exp(-dt / 81);
    state.cam.s += (state.camT.s - state.cam.s) * ease;
    state.cam.x += (state.camT.x - state.cam.x) * ease;
    state.cam.y += (state.camT.y - state.cam.y) * ease;
  }
  [state.wpx, state.wpy] = state.px > -1e3 ? state.toWorld(state.px, state.py) : [-1e4, -1e4];
  state.skyK += ((state.sky ? 1 : 0) - state.skyK) * (state.reduce.matches ? 1 : 0.07);
  if (Math.abs(state.skyK - (state.sky ? 1 : 0)) < 0.002) state.skyK = state.sky ? 1 : 0;
  state.litGroup =
    state.cardGroup ??
    (state.dipPin > 0
      ? CARD_LANE[state.dipPin]!
      : state.dipSel > 0
        ? CARD_LANE[state.dipSel]!
        : state.dipHover > 0
          ? CARD_LANE[state.dipHover]!
          : null);
  const layer = (depth: number) => {
    const zoom = layerScale(state.cam.s, depth, state.skyK);
    state.ctx.setTransform(
      state.dpr * zoom,
      0,
      0,
      state.dpr * zoom,
      state.dpr * state.cam.x * depth * state.skyK,
      state.dpr * state.cam.y * depth * state.skyK,
    );
  };
  layer(DEPTH.chart);
  drawBackgroundChart(state);
  layer(DEPTH.nebula);
  state.drawNebula(t);
  layer(DEPTH.dust);
  drawDust(state, t);
  state.ctx.setTransform(
    state.dpr * state.cam.s,
    0,
    0,
    state.dpr * state.cam.s,
    state.dpr * state.cam.x,
    state.dpr * state.cam.y,
  );
  state.sz = state.cam.s ** -0.6;
  state.lwk = state.sz;
  const list = [...state.stars.values()];
  state.physics(t, dt, list);
  state.drawDipper(t);
  const live = state.drawClusters(t, list);
  state.drawFlows(t);
  state.drawTraces(t);
  state.drawHubLabels();
  state.drawPicking(t, list);
  state.drawBeams(t);
  state.drawStars(t, list);
  state.drawSignals(t, live);
  state.drawEffects(t, dt);
}
