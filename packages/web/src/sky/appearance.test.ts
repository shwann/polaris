// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { inlineCss, rules, matchingRules, hasDeclaration } from '../../tests/cssHarness';
import { createPage } from '../../tests/parityHarness';

it('hides only the sky-mode board while preserving the board defaults and measurable layout', () => {
  const html = readFileSync('plugin/assets/index.html', 'utf8');
  const page = createPage(html),
    css = rules(inlineCss(html));
  const wrap = page.document.createElement('div');
  wrap.className = 'p-App-wrap';
  page.document.body.append(wrap);
  const before = matchingRules(wrap, css);
  expect(before.some((r) => hasDeclaration(r, 'opacity', '0'))).toBe(false);
  expect(before.some((r) => hasDeclaration(r, 'visibility', 'hidden'))).toBe(false);
  expect(before.some((r) => hasDeclaration(r, 'display', 'grid'))).toBe(true);
  page.document.documentElement.classList.add('sky');
  const hidden = matchingRules(wrap, css);
  expect(hidden.some((r) => hasDeclaration(r, 'opacity', '0'))).toBe(true);
  expect(hidden.some((r) => hasDeclaration(r, 'visibility', 'hidden'))).toBe(true);
  expect(hidden.some((r) => hasDeclaration(r, 'display', 'none'))).toBe(false);
  expect(
    hidden.some((r) =>
      r.nodes.some(
        (d) =>
          d.prop === 'transition' && /opacity var\(--board-fade\).*visibility 0s var\(--board-fade\)/.test(d.value),
      ),
    ),
  ).toBe(true);
  page.document.documentElement.classList.remove('sky');
  expect(matchingRules(wrap, css)).toEqual(before);
  page.close();
});
