// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { rules } from './cssHarness';
const read = (p: string) => readFileSync(p, 'utf8');
// Additive UI lives in its own modules; preserve the exact v42 baseline for the original task-view styles.
const files = readdirSync('packages/web/src', { recursive: true }).filter(
  (p) =>
    String(p).endsWith('.css') &&
    !/^components\/(Requirements|Markdown|LocalEdit|TaskExecution|SkyLegend|Header\/Dispatch(Summary|Dialog))\//.test(
      String(p),
    ),
);
const migrated = files.map((p) => read('packages/web/src/' + p)).join('\n');
const legacy = read('history/index.v42.html').split('<style>')[1]!.split('</style>')[0]!;
const clean = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll('"', "'")
    .replace(/(?<![\w\d])\.(\d)/g, '0.$1')
    .replace(/\s/g, '');
function declarations(s: string) {
  return [...s.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?:;|(?=}))/g)]
    .map((m) => clean(m[1] + ':' + m[2]))
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}
it('preserves every legacy CSS declaration and numeric value across component modules (allowing shared declarations to move or repeat)', () => {
  // Only the sky-mode board veil intentionally differs; board-mode declarations stay exact.
  const veil = /html(?::global\(\.sky\)|\.sky)\s+\.wrap\s*\{[^}]*\}/g;
  const oldVeil = legacy.match(veil)!,
    newVeil = migrated.match(veil)!;
  expect(oldVeil).toHaveLength(1);
  expect(newVeil).toHaveLength(1);
  expect(declarations(oldVeil[0]!)).toEqual(['filter:blur(2px)', 'opacity:0.05', 'pointer-events:none']);
  expect(declarations(newVeil[0]!)).toEqual([
    'opacity:0',
    'pointer-events:none',
    'transition:opacity0.6sease,visibility0s0.6s',
    'visibility:hidden',
  ]);
  expect(declarations(migrated.replace(veil, ''))).toEqual(declarations(legacy.replace(veil, '')));
});
it('keeps every selector after module names are mapped back to the legacy classes', () => {
  const selectors = (s: string) =>
    [...s.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
      .flatMap((m) => (m[1]!.trim().startsWith('@') ? [] : m[1]!.split(',')))
      .map((s) =>
        clean(
          s
            .replace(/:global\(([^)]+)\)/g, '$1')
            .replace(/\.p-[A-Za-z]+-([\w-]+)/g, '.$1')
            .replace('#field', '.field')
            .replace(/\[data-dipcard\]/g, '.dipcard')
            .replace(/\[data-dipper\]/g, '.dip')
            .replace(/\[data-greek\]/g, '.gr')
            .replace(/\[data-clamp\]/g, '.clamp')
            .replace(/\[data-scan\]/g, '.scan')
            .replace(/\[data-task-row\]/g, '.row')
            .replace(/\[data-active-task\]/g, '.active')
            .replace(/\[data-lane-heading\]/g, '.lane-h')
            .replace(/\[data-code\]/g, '.k')
            .replace(/\[data-title\]/g, '.t')
            .replace(/\[data-right\]/g, '.r')
            .replace(/\[data-selected=['"]true['"]\]/g, '.on')
            .replace(/\[data-warning=['"]true['"]\]/g, '.warn')
            .replace(/\[data-late=['"]true['"]\]/g, '.late')
            .replace(/\[data-state=['"](\w+)['"]\]/g, '.$1')
            .replace('.dipcard .list', '.dipcard ul')
            .replace('.tabbar .actions', '.tabbar .side-row')
            .replace(/aside\.panel(?=\s|$)/g, (match, offset: number, input: string) =>
              input.slice(offset + match.length).trim() ? 'aside' : 'aside.hud',
            ),
        ),
      )
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort();
  const normalized = files
    .map((file) => {
      const css = read('packages/web/src/' + file);
      return String(file).endsWith('/Title.module.css') ? css.replace(/\.title/g, 'h1') : css;
    })
    .join('\n');
  expect(selectors(normalized)).toEqual(selectors(legacy));
});

it('isolates every additive requirement rule behind its own module classes', () => {
  const modules = readdirSync('packages/web/src/components/Requirements').filter((file) =>
    file.endsWith('.module.css'),
  );
  expect(modules).toHaveLength(6);
  for (const file of modules) {
    const css = read('packages/web/src/components/Requirements/' + file);
    expect(css, file).not.toContain(':global');
    for (const rule of rules(css)) {
      for (const selector of rule.selectors) expect(selector, file).toMatch(/\.[A-Za-z_][\w-]*/);
    }
  }
});
