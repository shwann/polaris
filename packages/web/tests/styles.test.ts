// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { rules } from './cssHarness';
const read = (p: string) => readFileSync(p, 'utf8');
// The sky engine and its bar are styled separately; every other board stylesheet follows the type scale below.
const files = readdirSync('packages/web/src', { recursive: true, encoding: 'utf8' }).filter(
  (p) => p.endsWith('.css') && !/^(sky|components\/(SkyBar|SkyLegend))\//.test(p),
);
const css = Object.fromEntries(files.map((p) => [p, read('packages/web/src/' + p)]));
const tokens = read('packages/web/src/styles/tokens.css');
// Five body sizes plus display sizes for stat numbers, the clock and the title; each has a 12px floor.
const SCALE = [
  '--fs-xs',
  '--fs-sm',
  '--fs-md',
  '--fs-lg',
  '--fs-xl',
  '--fs-hero',
  '--fs-stat',
  '--fs-display',
  '--fs-title',
  '--fs-title-en',
  '--fs-title-zh',
  '--fs-motto',
];

it('defines the type scale, none below 12px', () => {
  const defined = [...tokens.matchAll(/(--fs-[\w-]+):\s*([^;]+);/g)];
  expect(defined.map((m) => m[1])).toEqual(SCALE);
  for (const [, name, value] of defined) {
    const floor = /^max\((\d+)px, .+\)$/.exec(value!);
    expect(floor, name).not.toBeNull();
    expect(Number(floor![1]), name).toBeGreaterThanOrEqual(12);
  }
});

it('sizes every board text with a scale token', () => {
  for (const [file, text] of Object.entries(css)) {
    if (file === 'styles/base.css') continue; // Root and projection sizes define what 1rem is.
    for (const rule of rules(text))
      for (const node of rule.nodes) {
        if (node.type !== 'decl') continue;
        if (node.prop === 'font-size') expect(node.value, `${file} ${rule.selector}`).toMatch(/^var\(--fs-[\w-]+\)$/);
        if (node.prop === 'font' && node.value !== 'inherit')
          expect(node.value, `${file} ${rule.selector}`).toMatch(/var\(--fs-[\w-]+\)/);
      }
  }
});

// Cut-corner HUD panels and the text glow are the board's look (restored after 1.6.0 flattened them),
// so there is no longer a test that forbids clip-path, corner ornaments or text-shadow outside a whitelist.

it('turns off looping and entry animations for reduced motion', () => {
  const base = read('packages/web/src/styles/base.css');
  const reduced = rules(base).filter((rule) => rule.parent?.params?.includes('prefers-reduced-motion: reduce'));
  expect(reduced.some((rule) => rule.nodes.some((n) => n.prop === 'animation-iteration-count'))).toBe(true);
  // Entry and matrix flow animations only run when motion is allowed.
  const motion = (file: string, selector: string) =>
    rules(css[file]!).filter(
      (rule) => rule.selector.includes(selector) && rule.nodes.some((n) => n.prop === 'animation'),
    );
  for (const [file, selector] of [
    ['styles/base.css', '.boot'],
    ['components/Matrix/Matrix.module.css', '.hatch'],
  ] as const) {
    const found = motion(file, selector);
    expect(found.length, selector).toBeGreaterThan(0);
    for (const rule of found) expect(rule.parent?.params, selector).toContain('prefers-reduced-motion: no-preference');
  }
});

it('isolates every additive requirement rule behind its own module classes', () => {
  const modules = readdirSync('packages/web/src/components/Requirements').filter((file) =>
    file.endsWith('.module.css'),
  );
  expect(modules).toHaveLength(6);
  for (const file of modules) {
    const text = read('packages/web/src/components/Requirements/' + file);
    expect(text, file).not.toContain(':global');
    for (const rule of rules(text)) {
      for (const selector of rule.selectors) expect(selector, file).toMatch(/\.[A-Za-z_][\w-]*/);
    }
  }
});
