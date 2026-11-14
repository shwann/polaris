// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { rules, hasDeclaration } from './cssHarness';
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
      (rule) =>
        rule.selector.includes(selector) && rule.nodes.some((n) => n.prop === 'animation' && n.value !== 'none'),
    );
  for (const [file, selector] of [
    ['styles/base.css', '.boot'],
    ['components/Matrix/Matrix.module.css', '.hatch'],
    ['components/Header/Title/Title.module.css', '.motto::after'],
  ] as const) {
    const found = motion(file, selector);
    expect(found.length, selector).toBeGreaterThan(0);
    for (const rule of found) expect(rule.parent?.params, selector).toContain('prefers-reduced-motion: no-preference');
  }
});

it('keeps the motto cursor lit without animation for reduced motion', () => {
  const title = rules(css['components/Header/Title/Title.module.css']!);
  const reduced = title.find(
    (rule) => rule.selector === '.motto::after' && rule.parent?.params === '(prefers-reduced-motion: reduce)',
  );
  expect(reduced).toBeDefined();
  expect(hasDeclaration(reduced!, 'animation', 'none')).toBe(true);
  expect(hasDeclaration(reduced!, 'opacity', '1')).toBe(true);
  expect(title.some((rule) => hasDeclaration(rule, 'animation', 'blink 1.1s step-end infinite'))).toBe(true);
});

it('disables the fixed scan overlay in big-text and fullscreen projection modes', () => {
  const base = rules(css['styles/base.css']!);
  for (const selector of ['html.proj body::after', 'html:fullscreen body::after']) {
    expect(base.some((rule) => rule.selectors.includes(selector) && hasDeclaration(rule, 'display', 'none'))).toBe(
      true,
    );
  }
  const overlay = base.find((rule) => rule.selector === 'body::after')!;
  expect(hasDeclaration(overlay, 'pointer-events', 'none')).toBe(true);
  expect(hasDeclaration(overlay, 'position', 'fixed')).toBe(true);
});

it('increments section numbers in document order from one shared counter', () => {
  const app = rules(css['App.module.css']!);
  expect(app.filter((rule) => rule.nodes.some((n) => n.prop === 'counter-reset'))).toHaveLength(1);
  expect(app.some((rule) => rule.selector === '.wrap' && hasDeclaration(rule, 'counter-reset', 'section'))).toBe(true);
  const shared = rules(css['components/Shared/Shared.module.css']!);
  const increments = shared.filter((rule) => rule.nodes.some((n) => n.prop === 'counter-increment'));
  expect(increments).toHaveLength(1);
  expect(increments[0]!.selector).toBe('.section-heading');
  expect(hasDeclaration(increments[0]!, 'counter-increment', 'section')).toBe(true);
  expect(
    shared.some(
      (rule) =>
        rule.selector === '.section-heading::before' &&
        hasDeclaration(rule, 'content', "'// ' counter(section, decimal-leading-zero)"),
    ),
  ).toBe(true);
});

it('clips telemetry from the right on one line and hides the header grid in sky mode', () => {
  const telemetry = rules(css['components/Header/Telemetry/Telemetry.module.css']!).find(
    (rule) => rule.selector === '.telemetry',
  )!;
  expect(hasDeclaration(telemetry, 'white-space', 'nowrap')).toBe(true);
  expect(hasDeclaration(telemetry, 'overflow', 'hidden')).toBe(true);
  expect(hasDeclaration(telemetry, 'text-overflow', 'ellipsis')).toBe(true);
  expect(
    rules(css['components/Header/Header.module.css']!).some(
      (rule) => rule.selector === ':global(.sky) .cover::after' && hasDeclaration(rule, 'display', 'none'),
    ),
  ).toBe(true);
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
