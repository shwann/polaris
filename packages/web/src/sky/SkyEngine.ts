import { hubObstacles } from './geometry/hubObstacles';
import { placeCard } from './geometry/cardPlacement';
import { COL, FIG_LANE } from '../domain/lanes';
import { filtering, laneTasks, nextCandidates, searchTasks, selectView, shipped } from '../domain/selectors';
import type { LayoutRegistry } from '../layout/LayoutRegistry';
import { dataStore } from '../store/dataStore';
import { uiStore } from '../store/uiStore';
import { reveal } from './camera';
import { createState } from './createState';
import { attachInput } from './input';
import { stopCamera } from './motion/cameraMotion';
import { topArea } from './layout';
import type { Box, SkyEvents, SkyState } from './types';
import { clearTooltip } from './tooltip';
import { updateTasks } from './updateTasks';
export class SkyEngine {
  private state: SkyState | null = null;
  private cleanups: (() => void)[] = [];
  private raf = 0;
  constructor(canvas: HTMLCanvasElement, registry: LayoutRegistry, events: SkyEvents) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = (this.state = createState(canvas, ctx, registry, events));
    const sync = () => {
      const d = dataStore.getState(),
        u = uiStore.getState(),
        v = selectView(d.snapshot, u.system),
        skyChanged = s.sky !== u.sky;
      s.board = {
        app: v.app ? { ...v.app, releases: v.releases.map((r) => ({ v: r.version, at: r.releasedAt })) } : null,
        appVersion: v.appVersion,
        nextRelease: v.nextRelease,
      };
      s.systems = () => v.systems;
      s.sysSel = v.systemKey;
      s.booted = d.booted;
      updateTasks(s, v.tasks, new Map((d.snapshot?.requirements ?? []).map((r) => [r.id, r.title])));
      s.match = filtering(u) ? new Set(searchTasks(v.tasks, u).map((t) => t.id)) : null;
      s.padMode = u.input === 'pad';
      s.dipLit = u.hovered;
      s.cardGroup = u.hovered >= 0 ? FIG_LANE[u.hovered] || null : null;
      s.dipPin = u.pinned;
      s.dipSel = u.dip;
      if (s.selected !== u.selected) clearTooltip(s);
      s.selected = u.selected;
      // Closing a Dipper card keeps its links drawn; another star or leaving the star chart replaces/clears them.
      if (u.dip >= 1) {
        s.beamSel = u.dip;
        s.beamAll = u.dipAll;
      }
      if (!u.sky) s.beamSel = -1;
      const k = u.dip >= 1 ? u.dip : s.beamSel,
        g = FIG_LANE[k];
      s.dipIds =
        u.dip === 0
          ? [
              ...shipped(v.tasks, v.appVersion).map((t) => ({ id: t.id })),
              ...nextCandidates(v.tasks, v.app?.next).map((t) => ({ id: t.id, dash: true })),
            ]
          : g
            ? (s.beamAll ? laneTasks(v.tasks, g) : laneTasks(v.tasks, g).slice(0, 8)).map((t) => t.id)
            : [];
      s.sky = u.sky;
      if (skyChanged) {
        s.rebuild();
        if (!u.sky) this.resetView();
        else s.ripple(s.w / 2, s.h / 2, COL.doing, 0.5);
      }
      if (s.reduce.matches) this.paint(performance.now());
    };
    let revision = dataStore.getState().logRevision;
    this.cleanups.push(
      dataStore.subscribe(() => {
        if (dataStore.getState().logRevision !== revision) {
          revision = dataStore.getState().logRevision;
          this.celebrate();
        }
        sync();
      }),
      uiStore.subscribe(sync),
      registry.subscribe(() => {
        s.measureHeader();
        if (s.reduce.matches) this.paint(performance.now());
      }),
    );
    s.size();
    sync();
    const resize = () => {
      registry.update();
      s.size();
      this.paint(performance.now());
    };
    window.addEventListener('resize', resize);
    this.cleanups.push(() => window.removeEventListener('resize', resize));
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) registry.update();
    });
    this.cleanups.push(() => {
      active = false;
    });
    this.cleanups.push(attachInput(s));
    {
      const loop = (t: number) => {
        this.raf = requestAnimationFrame(loop);
        if (document.hidden) {
          s.last = 0;
          return;
        }
        this.paint(t);
      };
      this.raf = requestAnimationFrame(loop);
    }
    this.paint(performance.now());
  }
  private paint(t: number) {
    try {
      if (this.state) this.state.frame(this.state.reduce.matches ? 0 : t);
    } catch (e) {
      console.warn('star chart frame skipped', e);
    }
  }
  zoom(f: number) {
    const s = this.state;
    if (s) s.zoomTo(s.w / 2, s.h / 2, s.camT.s * f);
  }
  resetView() {
    const s = this.state;
    if (s) {
      clearTooltip(s);
      stopCamera(s);
      s.drag = null;
      s.pointers.clear();
      Object.assign(s.camT, { s: 1, x: 0, y: 0 });
    }
  }
  reveal(id: string, options: { zoom?: number; area?: Box } = {}) {
    const s = this.state;
    return s ? reveal(s, id, { ...options, ...(s.w <= 560 ? { area: topArea(s) } : {}) }) : false;
  }
  focus(id: string | null, x = 0, y = 0) {
    const s = this.state;
    if (s) s.focus = id ? { id, x, y } : null;
  }
  dipScreen(index: number) {
    const s = this.state,
      p = s?.dipPos[index];
    return s && p ? s.toScreen(...p) : null;
  }
  hubObstacles(exclude = -1) {
    return this.state ? hubObstacles(this.state, exclude) : [];
  }
  placeGroupCard(index: number, width: number, height: number) {
    const s = this.state,
      p = this.dipScreen(index);
    if (!s || !p || !s.sky || s.w <= 560) return null;
    const gp = this.groupScreen(index) || p;
    const cluster: Box = [Math.min(p[0], gp[0]), Math.min(p[1], gp[1]), Math.max(p[0], gp[0]), Math.max(p[1], gp[1])];
    const placement = placeCard(p, cluster, [width, height], [s.w, s.h - 74], undefined, hubObstacles(s, index));
    if (Math.hypot(...placement.pan) > 0.75) {
      s.camT.x = s.cam.x + placement.pan[0];
      s.camT.y = s.cam.y + placement.pan[1];
    }
    return placement;
  }
  groupScreen(index: number) {
    const s = this.state,
      g = FIG_LANE[index];
    if (!s || !g || !s.laneCount(g)) return null;
    const [x, y] = s.centre(g);
    return s.toScreen(...s.at(x, y, 14));
  }
  celebrate() {
    const s = this.state;
    if (!s) return;
    s.ripple(s.w / 2, s.h * 0.4, COL.doing, 0.9);
    for (const star of s.stars.values()) star.flare = Math.max(star.flare, 0.55);
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.cleanups.splice(0).forEach((f) => f());
    if (this.state) {
      delete (this.state.ctx as Partial<CanvasRenderingContext2D>).lineWidth;
      this.state.tints.clear();
      this.state.stars.clear();
      this.state = null;
    }
  }
}
