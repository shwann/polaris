import { createRequire } from 'node:module';
interface TestDOM {
  window: Window & typeof globalThis;
}
interface TestConsole {
  on(event: string, callback: (error: unknown) => void): void;
}
// The installed jsdom runtime has no declarations; this fixture describes only the surface it uses.
const runtime: unknown = createRequire(import.meta.url)('jsdom');
const { JSDOM, VirtualConsole } = runtime as {
  JSDOM: new (
    html: string,
    options: { url: string; pretendToBeVisual: boolean; runScripts: string; virtualConsole: TestConsole },
  ) => TestDOM;
  VirtualConsole: new () => TestConsole;
};
export function createPage(html: string) {
  const errors: unknown[] = [],
    console = new VirtualConsole();
  console.on('jsdomError', (e) => {
    if (!String(e).includes('Could not parse CSS stylesheet')) errors.push(e);
  });
  const dom = new JSDOM(html, {
      url: 'https://polaris.test/',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
      virtualConsole: console,
    }),
    w = dom.window;
  const gradient = { addColorStop: () => {} },
    ctx = new Proxy({} as Record<string, unknown>, {
      get: (o, k) =>
        o[String(k)] ??
        (o[String(k)] =
          k === 'createRadialGradient' || k === 'createLinearGradient'
            ? () => gradient
            : k === 'measureText'
              ? () => ({ width: 40 })
              : () => {}),
      set: (o, k, v) => {
        o[String(k)] = v;
        return true;
      },
    });
  Object.defineProperty(w.HTMLCanvasElement.prototype, 'getContext', { value: () => ctx });
  Object.defineProperty(w, 'matchMedia', {
    value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  Object.defineProperty(w.Range.prototype, 'getBoundingClientRect', { value: () => new w.DOMRect() });
  w.requestAnimationFrame = () => 0;
  w.cancelAnimationFrame = () => {};
  return {
    dom,
    errors,
    document: w.document,
    run(code: string) {
      w.eval(code);
    },
    close() {
      w.close();
    },
  };
}
export async function ready(page: ReturnType<typeof createPage>, selector: string) {
  for (let n = 0; n < 60; n++) {
    if (page.document.querySelector(selector)) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Dashboard did not settle');
}
export const text = (root: ParentNode, selector: string) =>
  Array.from(root.querySelectorAll(selector)).map((n) => (n.textContent || '').replace(/\s+/g, ' ').trim());
