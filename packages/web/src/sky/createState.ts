import { COL, FIG_LANE, GOLD } from '../domain/lanes';
import type { LayoutRegistry } from '../layout/LayoutRegistry';
import * as camera from './camera';
import { WIDE } from './constants';
import { drawBeams } from './draw/beams';
import { drawClusters } from './draw/clusters';
import { drawDipper } from './draw/dipper';
import { drawEffects } from './draw/effects';
import { drawChart } from './draw/field';
import * as flows from './draw/flows';
import { drawHubLabels } from './draw/labels';
import { drawNebula } from './draw/nebula';
import { drawPicking } from './draw/picking';
import { drawPolaris } from './draw/polaris';
import { drawSignals } from './draw/signals';
import { drawStars } from './draw/stars';
import { drawTraces } from './draw/traces';
import { frame } from './frame';
import * as geometry from './geometry/clusters';
import * as layout from './layout';
import { makeHalo, tint } from './palette';
import { physics } from './physics';
import { emitTooltip } from './tooltip';
import type { SkyEvents, SkyState } from './types';
export function createState(
  cvs: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  registry: LayoutRegistry,
  events: SkyEvents,
): SkyState {
  // Methods are bound below before the first frame can run.
  const s = {
    cvs,
    ctx,
    registry,
    events,
    board: { app: null, appVersion: '—', nextRelease: '' },
    systems: () => [],
    sysSel: '',
    booted: false,
    reduce: matchMedia('(prefers-reduced-motion: reduce)'),
    w: 0,
    h: 0,
    dpr: 1,
    unit: 1,
    ZONE: WIDE,
    lwk: 1,
    sz: 1,
    cam: { s: 1, x: 0, y: 0 },
    camT: { s: 1, x: 0, y: 0 },
    pointers: new Map(),
    drag: null,
    padMode: false,
    inertia: [0, 0],
    returning: false,
    match: null,
    selected: null,
    wpx: -1e4,
    wpy: -1e4,
    px: -1e4,
    py: -1e4,
    mx: 0,
    my: 0,
    tx: 0,
    ty: 0,
    focus: null,
    hover: null,
    dipLit: -1,
    dipGlow: 0,
    dipPin: -1,
    dipPos: [],
    tetherHub: new Map(),
    dipHover: -1,
    dipSel: -1,
    dipIds: null,
    sky: false,
    skyK: 0,
    smallBox: null,
    smallPole: null,
    bowl: null,
    veilY: -1,
    unvN: 0,
    litGroup: null,
    cardGroup: null,
    counts: new Map(),
    stars: new Map(),
    trees: new Map(),
    dust: [],
    ripples: [],
    comets: [],
    pulses: [],
    packets: [],
    chart: null,
    boardChart: null,
    chartCore: null,
    chartBox: [0, 0, 0, 0],
    layoutScale: 1,
    tooltipGate: null,
    tints: new Map(),
    halo: makeHalo(),
    nextPacket: 0,
    lastPulse: 0,
    nextComet: 0,
    last: 0,
    onSky: false,
    api: {
      onSelect: (id: string | null) => events.onPickStar?.(id),
      onSelectedMove: (x: number, y: number, cluster?: import('./types').Box) => events.onSelectedMove?.(x, y, cluster),
    },
  } as unknown as SkyState;
  Object.assign(s, {
    centre: geometry.centre.bind(null, s),
    home: geometry.home.bind(null, s),
    rebuild: geometry.rebuild.bind(null, s),
    at: camera.at.bind(null, s),
    toWorld: camera.toWorld.bind(null, s),
    toScreen: camera.toScreen.bind(null, s),
    zoomTo: camera.zoomTo.bind(null, s),
    tint: tint.bind(null, s),
    laneCount: (g: import('../domain/types').Lane | null) => (g ? s.counts.get(g) || 0 : 0),
    linkFade: (g: string) => (g === 'done' ? Math.min(1, Math.max(0, (s.cam.s - 1.4) / 1)) : 1),
    OWN: (k: number) => (k === 7 ? GOLD : k === 0 ? COL.doing : COL[FIG_LANE[k]!] || GOLD),
    hubs: layout.hubs.bind(null, s),
    size: layout.size.bind(null, s),
    measureHeader: layout.measureHeader.bind(null, s),
    drawChart: drawChart.bind(null, s),
    drawNebula: drawNebula.bind(null, s),
    arcs: flows.arcs.bind(null, s),
    arcPoint: flows.arcPoint.bind(null, s),
    drawFlows: flows.drawFlows.bind(null, s),
    drawTraces: drawTraces.bind(null, s),
    drawPolaris: drawPolaris.bind(null, s),
    drawDipper: drawDipper.bind(null, s),
    drawHubLabels: drawHubLabels.bind(null, s),
    physics: physics.bind(null, s),
    drawClusters: drawClusters.bind(null, s),
    drawPicking: drawPicking.bind(null, s),
    drawBeams: drawBeams.bind(null, s),
    drawStars: drawStars.bind(null, s),
    drawSignals: drawSignals.bind(null, s),
    drawEffects: drawEffects.bind(null, s),
    frame: frame.bind(null, s),
    emitTooltip: emitTooltip.bind(null, s),
    ripple: (x: number, y: number, c: import('./types').Color, power = 0.6) => {
      s.ripples.push({ x, y, c, t0: performance.now(), power, hit: new Set() });
      if (s.ripples.length > 6) s.ripples.shift();
    },
  });
  try {
    const lw = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth');
    if (lw?.get && lw.set) {
      Object.defineProperty(ctx, 'lineWidth', {
        configurable: true,
        get() {
          return lw.get!.call(ctx) / s.lwk;
        },
        set(v: number) {
          lw.set!.call(ctx, v * s.lwk);
        },
      });
    }
  } catch {
    /* Some embedded canvases do not expose property descriptors. */
  }
  return s;
}
