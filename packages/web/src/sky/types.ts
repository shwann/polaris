import type { WaitingOn } from '@polaris/core';
import type { Particle, SoftBody } from './motion/softbody';
import type { Sample } from './motion/inertia';
import type { Color } from '../domain/lanes';
import type { BoardView, Lane } from '../domain/types';
import type { LayoutRegistry } from '../layout/LayoutRegistry';
import type { HubLabel } from './draw/labels';
export type { Color } from '../domain/lanes';
export type Point = [number, number];
export type Box = [number, number, number, number];
export type Triple = [number, number, number];
export interface Star {
  id: string;
  group: Lane;
  ang: number;
  rad: number;
  layoutX?: number;
  layoutY?: number;
  baseX?: number;
  baseY?: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  alpha: number;
  flare: number;
  ph: number;
  f: number;
  x: number;
  y: number;
  skyCode?: string;
  code: string;
  title: string;
  late: boolean;
  /** Who a waiting star waits on; 等客户 and 等前置 are drawn a step dimmer. */
  wait?: WaitingOn;
  /** Stars sharing this key (same requirement, else same code prefix) are joined by one string of links. */
  chain?: string;
  /** Tooltip line naming the chain: 需求 <ID> <标题> or 同组：<前缀>. */
  chainLabel?: string;
  /** Done within the last few days: drawn brighter than older shipped work. */
  recent?: boolean;
  /** Title with the prefix it shares with its cluster neighbours removed, for short labels. */
  skyTitle?: string;
  dead: boolean;
}
export interface Camera {
  s: number;
  x: number;
  y: number;
}
export interface Drag {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  moved: boolean;
  star: Star | null;
  samples: Sample[];
  grab: Point;
  dip: number;
  mobileWeights?: Map<Star, number>;
  pinch?: number;
  anchor?: Point;
  s0?: number;
}
export interface Zone extends Record<Lane | 'pole', Point> {
  dip?: boolean;
  side: number[];
  app: Point;
}
export interface SkyEvents {
  onPickStar?(id: string | null): void;
  onPickDipper?(index: number): void;
  onSelectedMove?(x: number, y: number, cluster?: Box): Point | void;
  onTooltip?(text: string, detail: string, x: number, y: number): void;
  onCursor?(cursor: string): void;
  isBlocked?(target: EventTarget | null, wheel?: boolean): boolean;
}
export interface SkyMethods {
  centre(g: Lane): Triple;
  home(s: Star, t: number): Point;
  rebuild(): void;
  laneCount(g: Lane | null | undefined): number;
  at(x: number, y: number, k: number): Point;
  toScreen(x: number, y: number): Point;
  toWorld(x: number, y: number): Point;
  zoomTo(x: number, y: number, n: number): void;
  tint(c: Color): HTMLCanvasElement;
  linkFade(g: Lane): number;
  OWN(k: number): Color;
  hubs(): Point[];
  measureHeader(): void;
  size(): void;
  drawChart(): void;
  drawNebula(t: number): void;
  arcs(): [Lane, Lane][];
  arcPoint(a: Lane, b: Lane, k: number): Point;
  drawFlows(t: number): void;
  drawTraces(t: number): void;
  drawPolaris(x: number, y: number, S: number, t: number): void;
  drawDipper(t: number): void;
  drawHubLabels(): void;
  physics(t: number, dt: number, list: Star[]): void;
  drawClusters(t: number, list: Star[]): [Star, Star][];
  drawPicking(t: number, list: Star[]): void;
  drawBeams(t: number): void;
  drawStars(t: number, list: Star[]): void;
  drawSignals(t: number, live: [Star, Star][]): void;
  drawEffects(t: number, dt: number): void;
  frame(t: number): void;
  ripple(x: number, y: number, c: Color, power?: number): void;
  emitTooltip(): void;
}
export interface SkyState extends SkyMethods {
  /** Cluster spin clock in ms; advances slower when zoomed in. */
  spinT?: number;
  cvs: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  registry: LayoutRegistry;
  events: SkyEvents;
  board: {
    app: (NonNullable<BoardView['app']> & { releases: { v: string; at: string }[] }) | null;
    appVersion: string;
    nextRelease: string;
  };
  systems: () => BoardView['systems'];
  sysSel: string;
  booted: boolean;
  reduce: MediaQueryList;
  w: number;
  h: number;
  dpr: number;
  unit: number;
  ZONE: Zone;
  lwk: number;
  sz: number;
  cam: Camera;
  camT: Camera;
  pointers: Map<number, Point>;
  drag: Drag | null;
  padMode: boolean;
  inertia: Point;
  returning: boolean;
  match: Set<string> | null;
  selected: string | null;
  wpx: number;
  wpy: number;
  px: number;
  py: number;
  mx: number;
  my: number;
  tx: number;
  ty: number;
  focus: { id: string; x: number; y: number } | null;
  hover: Star | null;
  dipLit: number;
  dipGlow: number;
  dipPin: number;
  dipPos: Point[];
  /** Star each Dipper tether is attached to, kept between frames so it does not hop between equal candidates. */
  tetherHub: Map<Lane, string>;
  hubParticles: Particle[];
  hubLabelBoxes?: Box[][];
  /** Side each Dipper caption took last frame (see chooseHubSide), so it only moves when it has to. */
  hubSides?: (number | undefined)[];
  /** Screen-space box of the "已完成 N 项" summary drawn last frame, in world coordinates; task labels keep off it. */
  doneLabelBox?: Box | null;
  /** Dipper captions laid out this frame, painted after the task stars in the wide sky view. */
  hubLabelQueue?: HubLabel[];
  /** Groups whose drift is paused because the pointer is over them or a card is open on them. */
  paused?: Set<Lane>;
  /** Spin time each paused group has skipped, so it resumes where it stopped. */
  spinHeld?: Map<Lane, number>;
  soft: SoftBody;
  dipHover: number;
  dipSel: number;
  dipIds: (string | { id: string; dash?: boolean })[] | null;
  /** Dipper star whose task links stay drawn after its card closes (-1: none). */
  beamSel: number;
  beamAll: boolean;
  sky: boolean;
  skyK: number;
  smallBox: Box | null;
  smallPole: Point | null;
  bowl: Triple | null;
  veilY: number;
  unvN: number;
  litGroup: Lane | null;
  cardGroup: Lane | null;
  counts: Map<Lane, number>;
  stars: Map<string, Star>;
  trees: Map<Lane, [Star, Star][]>;
  dust: { x: number; y: number; m: number; ph: number }[];
  ripples: { x: number; y: number; c: Color; t0: number; power: number; small?: boolean; hit: Set<Star> }[];
  comets: { x: number; y: number; vx: number; vy: number; delay: number }[];
  pulses: { a: Star; b: Star; t0: number; dur: number }[];
  packets: { a: Lane; b: Lane; t0: number; dur: number }[];
  chart: HTMLCanvasElement | null;
  boardChart: HTMLCanvasElement | null;
  chartCore: HTMLCanvasElement | null;
  chartBox: Box;
  layoutScale: number;
  labelLayout?: { key: string; settled: boolean; revision: number };
  tooltipSettling?: boolean;
  tooltipGate: { x: number; y: number; id: string | null } | null;
  tints: Map<string, HTMLCanvasElement>;
  halo: HTMLCanvasElement;
  nextPacket: number;
  lastPulse: number;
  nextComet: number;
  last: number;
  onSky: boolean;
  api: { onSelect: (id: string | null) => void; onSelectedMove: (x: number, y: number, cluster?: Box) => Point | void };
}
