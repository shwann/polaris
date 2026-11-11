// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { expect, it } from 'vitest';
import { scopedName } from '../vite/scopedName';
import { inlineCss, rules, hasDeclaration } from './cssHarness';

const source = 'packages/web/src';
const modules = readdirSync(source, { recursive: true, encoding: 'utf8' }).filter((file) =>
  file.endsWith('.module.css'),
);
const html = readFileSync('plugin/assets/index.html', 'utf8');
const css = inlineCss(html);
const builtRules = rules(css);

it.each(modules)('includes a generated selector from %s in the built inline CSS', (file) => {
  const input = readFileSync(`${source}/${file}`, 'utf8').replace(/:global\([^)]+\)/g, '');
  const name = rules(input).flatMap((rule) => [...rule.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)])[0]?.[1];
  expect(name, `${file} must own a local rule`).toBeTruthy();
  const selector = new RegExp('\\.' + scopedName(name!, file) + '(?![\\w-])');
  expect(builtRules.some((rule) => selector.test(rule.selector))).toBe(true);
});

it('ships container sizing, both narrow-card marks, hidden subtitle and global styles', () => {
  expect(builtRules.some((rule) => hasDeclaration(rule, 'container-type', 'inline-size'))).toBe(true);
  for (const mark of ['[data-dipper]', '[data-greek]']) {
    expect(
      builtRules.some(
        (rule) =>
          rule.parent?.name === 'container' &&
          rule.parent.params?.includes('230px') &&
          rule.selector.includes(mark) &&
          hasDeclaration(rule, 'display', 'none'),
      ),
    ).toBe(true);
  }
  expect(builtRules.some((rule) => rule.selector === '.p-Header-sub' && hasDeclaration(rule, 'display', 'none'))).toBe(
    true,
  );
  expect(css).toContain('@container');
  expect(css).toContain('--bg:');
  for (const name of ['.hud', '.boot', 'html.proj', 'html.sky']) expect(css).toContain(name);
  expect(statSync('plugin/assets/index.html').size).toBeLessThanOrEqual(400 * 1024);
});
