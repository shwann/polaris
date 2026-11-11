import { p2 } from '../../domain/time';
import { hash } from '../palette';
import type { Box, Point, SkyState } from '../types';
import { BOARD_PIXELS, CHART_FADE, chartGeometry, rasterSize } from './chartGeometry';

/** Paint the original chart in viewport coordinates, optionally extended into an atlas. */
function paint(g: CanvasRenderingContext2D, state: SkyState, box: Box, extended: boolean) {
  // Milky Way: a soft band from lower left to upper right, clouds plus a dense dust of faint stars, seeded so it never jumps.
  const band = (u: number): Point => [u * state.w, state.h * (0.98 - 0.78 * u) + Math.sin(u * 5.2) * state.h * 0.05];
  const segments = extended
    ? Array.from(
        { length: Math.ceil(box[2] / state.w) - Math.floor(box[0] / state.w) },
        (_, i) => Math.floor(box[0] / state.w) + i,
      )
    : [0];
  for (const segment of segments) {
    const seed = (key: string, i: number) => key + (segment ? `${segment}:` : '') + i;
    for (let i = 0; i < 90; i++) {
      const u = segment + hash(seed('mw', i), 1),
        [x, y] = band(u),
        off = (hash(seed('mw', i), 2) - 0.5) * state.h * 0.2,
        r = state.unit * (0.06 + hash(seed('mw', i), 3) * 0.12);
      const hue = hash(seed('mw', i), 4),
        col = hue < 0.55 ? '120,170,255' : hue < 0.85 ? '170,130,255' : '255,200,150';
      const rg = g.createRadialGradient(x, y + off, 0, x, y + off, r);
      rg.addColorStop(0, `rgba(${col},${0.045 + hash(seed('mw', i), 5) * 0.05})`);
      rg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = rg;
      g.fillRect(x - r, y + off - r, r * 2, r * 2);
    }
    for (let i = 0; i < Math.min(2600, (state.w * state.h) / 600); i++) {
      const u = segment + hash(seed('ms', i), 1),
        [x, y] = band(u),
        gauss = (hash(seed('ms', i), 2) + hash(seed('ms', i), 3) + hash(seed('ms', i), 4) - 1.5) * state.h * 0.14;
      g.fillStyle = `rgba(200,220,255,${0.11 + hash(seed('ms', i), 5) * 0.3})`;
      g.fillRect(x + (hash(seed('ms', i), 6) - 0.5) * 20, y + gauss, 0.7, 0.7);
    }
  }
  // Dark lane down the middle of the band, as in the real Milky Way.
  g.globalCompositeOperation = 'destination-out';
  for (const segment of segments) {
    const seed = (key: string, i: number) => key + (segment ? `${segment}:` : '') + i;
    for (let i = 0; i < 46; i++) {
      const u = segment + hash(seed('dl', i), 1),
        [x, y] = band(u),
        yy = y + (hash(seed('dl', i), 2) - 0.5) * state.h * 0.03,
        r = state.unit * (0.02 + hash(seed('dl', i), 3) * 0.035);
      const rg = g.createRadialGradient(x, yy, 0, x, yy, r);
      rg.addColorStop(0, 'rgba(0,0,0,.22)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, yy - r, r * 2, r * 2);
    }
  }
  g.globalCompositeOperation = 'source-over';
  const cx = state.w / 2,
    cy = state.h * 1.25,
    R0 = Math.hypot(state.w, state.h) * 0.45;
  g.strokeStyle = 'rgba(90,170,255,.095)';
  g.lineWidth = 0.7;
  const originalReach = Math.hypot(state.w / 2, state.h * 1.25);
  const reach = Math.max(...[box[0], box[2]].flatMap((x) => [box[1], box[3]].map((y) => Math.hypot(x - cx, y - cy))));
  for (let k = 0; k < (extended ? Math.max(9, Math.ceil((reach - R0) / (state.unit * 0.11)) + 1) : 9); k++) {
    const radius = R0 + k * state.unit * 0.11;
    // New parallels start beyond the original viewport; its original nine stay unchanged.
    if (k >= 9 && radius <= originalReach) continue;
    g.beginPath();
    g.arc(cx, cy, radius, extended ? 0 : Math.PI, 2 * Math.PI);
    g.stroke();
  }
  for (let k = extended ? -24 : -8; k <= (extended ? 24 : 8); k++) {
    const a = -Math.PI / 2 + k * 0.13;
    // Extra rays begin outside the original chart rather than adding lines to its centre.
    const start = Math.abs(k) <= 8 ? R0 * 0.55 : originalReach;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * start, cy + Math.sin(a) * start);
    g.lineTo(cx + Math.cos(a) * Math.max(R0 * 3, reach), cy + Math.sin(a) * Math.max(R0 * 3, reach));
    g.stroke();
  }
  g.setLineDash([2, 6]);
  g.strokeStyle = 'rgba(255,176,46,.1)';
  g.beginPath();
  if (extended) {
    g.moveTo(box[0], state.h * 0.62 - (box[0] * state.h * 0.24) / (state.w * 0.3));
    g.lineTo(0, state.h * 0.62);
  } else g.moveTo(0, state.h * 0.62);
  g.bezierCurveTo(state.w * 0.3, state.h * 0.38, state.w * 0.7, state.h * 0.5, state.w, state.h * 0.28);
  if (extended) g.lineTo(box[2], state.h * 0.28 - ((box[2] - state.w) * state.h * 0.22) / (state.w * 0.3));
  g.stroke();
  g.setLineDash([]);
  g.font = `500 ${Math.max(9, state.unit * 0.011)}px "JetBrains Mono", monospace`;
  g.fillStyle = 'rgba(120,170,230,.28)';
  for (let k = -8; k <= 8; k += 2) {
    const a = -Math.PI / 2 + k * 0.13,
      x = cx + Math.cos(a) * (R0 + state.unit * 0.9),
      y = cy + Math.sin(a) * (R0 + state.unit * 0.9);
    if (x > 8 && x < state.w - 40 && y > 12) g.fillText(`${p2(((k + 8) * 1.5) | 0)}h`, x, y);
  }
  g.fillText('ECLIPTIC', state.w * 0.5 + 12, state.h * 0.455);
  // Fade the graticule where the panels sit (centre) and keep it crisp in the open margins.
  const m = g.createRadialGradient(
    state.w / 2,
    state.h * 0.55,
    Math.min(state.w, state.h) * 0.15,
    state.w / 2,
    state.h * 0.55,
    Math.hypot(state.w, state.h) * 0.62,
  );
  m.addColorStop(0, 'rgba(0,0,0,.26)');
  m.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = m;
  g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  g.globalCompositeOperation = 'source-over';
}

/** Only resize builds these caches; frames sample just the visible source rectangle. */
export function drawChart(state: SkyState) {
  const geometry = chartGeometry(state.w, state.h, state.dpr);
  state.chartBox = geometry.box;
  const make = (box: Box, width: number, height: number, extended: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d')!;
    if (extended) {
      g.scale(width / (box[2] - box[0]), height / (box[3] - box[1]));
      g.translate(-box[0], -box[1]);
    } else {
      const original = width === Math.round(state.w * state.dpr) && height === Math.round(state.h * state.dpr);
      g.setTransform(original ? state.dpr : width / state.w, 0, 0, original ? state.dpr : height / state.h, 0, 0);
    }
    paint(g, state, box, extended);
    if (extended) {
      g.globalCompositeOperation = 'destination-out';
      for (const [x0, y0, x1, y1, dx, dy] of [
        [box[0], box[1], box[2], box[1] + CHART_FADE, 0, CHART_FADE],
        [box[0], box[3], box[2], box[3] - CHART_FADE, 0, -CHART_FADE],
        [box[0], box[1], box[0] + CHART_FADE, box[3], CHART_FADE, 0],
        [box[2], box[1], box[2] - CHART_FADE, box[3], -CHART_FADE, 0],
      ] as const) {
        const fade = g.createLinearGradient(x0, y0, x0 + dx, y0 + dy);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fade;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    return canvas;
  };
  // Release superseded backing stores before allocating replacements on resize.
  if (state.chart) state.chart.width = state.chart.height = 0;
  if (state.boardChart) state.boardChart.width = state.boardChart.height = 0;
  if (state.chartCore) state.chartCore.width = state.chartCore.height = 0;
  state.chart = make(geometry.box, geometry.width, geometry.height, true);
  // Preserve the exact original viewport raster for the board/header baseline.
  const board = rasterSize(Math.round(state.w * state.dpr), Math.round(state.h * state.dpr), 1, BOARD_PIXELS);
  state.boardChart = make([0, 0, state.w, state.h], board.width, board.height, false);
  // A complementary soft cutout retains original fine stars/text at native resolution.
  const core = (state.chartCore = document.createElement('canvas'));
  core.width = board.width;
  core.height = board.height;
  const g = core.getContext('2d')!;
  g.scale(core.width / state.w, core.height / state.h);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, state.w, state.h);
  g.globalCompositeOperation = 'destination-in';
  for (const [x, y, length] of [
    [state.w, 0, state.w],
    [0, state.h, state.h],
  ] as const) {
    const edge = Math.min(0.5, CHART_FADE / length);
    const fade = g.createLinearGradient(0, 0, x, y);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(edge, 'rgba(0,0,0,1)');
    fade.addColorStop(1 - edge, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, state.w, state.h);
  }
  const atlas = state.chart.getContext('2d')!;
  atlas.globalCompositeOperation = 'destination-out';
  atlas.drawImage(core, 0, 0, state.w, state.h);
  atlas.globalCompositeOperation = 'source-over';
  g.globalCompositeOperation = 'source-in';
  g.drawImage(state.boardChart, 0, 0, state.w, state.h);
  g.globalCompositeOperation = 'source-over';
}
