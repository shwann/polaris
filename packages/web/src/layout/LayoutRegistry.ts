export type LayoutKey =
  | 'cover'
  | 'clock'
  | 'actions'
  | 'status'
  | 'watch'
  | 'kicker'
  | 'en'
  | 'zh'
  | 'motto'
  | 'ticker'
  | 'tabs'
  | 'figures'
  | 'skybar'
  | 'legend'
  | 'dipcard';
export class LayoutRegistry {
  private nodes = new Map<LayoutKey, { node: HTMLElement; text: boolean }>();
  private rects = new Map<LayoutKey, DOMRect>();
  private listeners = new Set<() => void>();
  private observer: ResizeObserver | null = null;
  constructor() {
    if (typeof ResizeObserver !== 'undefined') this.observer = new ResizeObserver(() => this.update());
  }
  register(key: LayoutKey, node: HTMLElement, text = false) {
    this.nodes.set(key, { node, text });
    this.observer?.observe(node);
    this.update();
    return () => {
      this.observer?.unobserve(node);
      if (this.nodes.get(key)?.node === node) {
        this.nodes.delete(key);
        this.rects.delete(key);
        this.update();
      }
    };
  }
  update() {
    for (const [key, { node, text }] of this.nodes) {
      if (text) {
        const r = document.createRange();
        r.selectNodeContents(node);
        this.rects.set(
          key,
          typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect() : node.getBoundingClientRect(),
        );
      } else this.rects.set(key, node.getBoundingClientRect());
    }
    this.listeners.forEach((f) => f());
  }
  get(key: LayoutKey) {
    return this.rects.get(key);
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  dispose() {
    this.observer?.disconnect();
    this.nodes.clear();
    this.rects.clear();
    this.listeners.clear();
  }
}
export const layoutRegistry = new LayoutRegistry();
