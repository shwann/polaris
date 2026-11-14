// @vitest-environment node
import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { embedData } from '@polaris/core';
import { legacySample, sample } from './fixtures/sample';
import { createPage, ready, text } from './parityHarness';
import { inlineCss, rules, matchingRules, hasDeclaration } from './cssHarness';
const styleSample = {
  ...legacySample,
  tasks: (legacySample.tasks as Record<string, unknown>[]).map((task) => ({
    ...task,
    detail: '规则匹配回归用的任务说明',
    ref: 'docs/style-check.md',
    needs: '请核对规则',
    unverified: '等待实证',
  })),
};
async function comparePages(
  check: (
    old: ReturnType<typeof createPage>,
    next: ReturnType<typeof createPage>,
    oldHtml: string,
    built: string,
  ) => void | Promise<void>,
  data = legacySample,
) {
  const oldHtml = readFileSync('history/index.v42.html', 'utf8'),
    built = readFileSync('plugin/assets/index.html', 'utf8');
  const old = createPage(oldHtml),
    next = createPage(embedData(built, data));
  try {
    old.run(
      'window.POLARIS_DATA=' + JSON.stringify(data) + ';\n' + oldHtml.split('<script>')[1]!.split('</script>')[0]!,
    );
    const code = next.document.querySelector('script[type="module"]')?.textContent;
    if (!code) throw new Error('No bundled JavaScript');
    next.run(code);
    await ready(old, '#main [data-id="LOGIN"]');
    await ready(next, '#main [data-id="LOGIN"]');
    await check(old, next, oldHtml, built);
    expect(old.errors).toEqual([]);
    expect(next.errors).toEqual([]);
  } finally {
    old.close();
    next.close();
  }
}

it('runs the original script and the built React bundle against identical legacy data', async () => {
  await comparePages((old, next) => {
    const a = old.document,
      b = next.document;
    expect(text(b, '.p-FigureCard-fig > b')).toEqual(text(a, '.fig > b'));
    expect(text(b, '.p-FigureCard-fig small')).toEqual(text(a, '.fig small'));
    expect(Array.from(b.querySelectorAll('.p-Matrix-cells i')).map((n) => n.getAttribute('aria-label'))).toEqual(
      // The waiting group was renamed from 等你或客户回复 to 等待中 after the original page.
      Array.from(a.querySelectorAll('.cells i')).map((n) =>
        n.getAttribute('aria-label')?.replace('等你或客户回复', '等待中'),
      ),
    );
    // Wide screens lift the waiting group into its own row, so only the set of cards must match.
    expect(text(b, '#main [data-id]').sort()).toEqual(text(a, '#main [data-id]').sort());
    expect(text(b, '.p-Digest-dg-row')).toEqual(text(a, '.dg-row').map((t) => t.replace('等你或客户回复', '等待中')));
    expect(text(b, '.p-LogPanel-log .p-LogPanel-txt')).toEqual(text(a, '.log .txt'));
  });
});

it('matches the same key elements to real CSS rules in the original and built pages', async () => {
  await comparePages(async (old, next, oldHtml, built) => {
    const oldRules = rules(inlineCss(oldHtml)),
      nextRules = rules(inlineCss(built));
    const pairs = [
      ['.wrap', '.p-App-wrap'],
      ['.cover', '.p-Header-cover'],
      ['.sub', '.p-Header-sub'],
      ['h1', 'h1'],
      ['.ticker', '.p-Ticker-ticker'],
      ['.clock', '.p-Clock-clock'],
      ['.live', '.p-Clock-live'],
      ['.watch .w-row', '.p-WatchRows-watch .p-WatchRows-w-row'],
      ['.side-row', '.p-ViewButtons-side-row'],
      ['.side-row .btn', '.p-ViewButtons-side-row .p-Shared-btn'],
      ['.fig', '.p-FigureCard-fig'],
      ['.fig .dip', '.p-FigureCard-fig [data-dipper]'],
      ['.ribbon', '.p-Matrix-ribbon'],
      ['.cells', '.p-Matrix-cells'],
      ['.cells i', '.p-Matrix-cells i'],
      ['.dg-row', '.p-Digest-dg-row'],
      ['.tools', '.p-FilterBar-tools'],
      ['.lane-h', '.p-LaneSection-lane-h'],
      ['.active', '.p-ActiveTask-active'],
      ['.step', '.p-ActiveTask-step'],
      ['.row', '.p-TaskRow-row'],
      ['.row .detail', '.p-TaskRow-row .p-TaskRow-detail'],
      ['.log .txt', '.p-LogPanel-log .p-LogPanel-txt'],
      ['.pulse i', '.p-LogPanel-pulse i'],
      ['.tip', '.p-SkyCanvas-tip'],
      ['#dipcard', '#dipcard'],
    ];
    const checkPair = (before: string, after: string, added = 0) => {
      const a = old.document.querySelectorAll(before),
        b = next.document.querySelectorAll(after);
      expect(a.length, before).toBeGreaterThan(0);
      expect(b.length, after).toBe(a.length + added);
      for (const [elements, cssRules] of [
        [a, oldRules],
        [b, nextRules],
      ] as const) {
        for (const element of elements) {
          const matched = matchingRules(element, cssRules).filter((rule) => rule.selector !== '*');
          expect(matched.length, element.outerHTML).toBeGreaterThan(0);
          // Ancestor classes can own descendant and pseudo-element rules as well.
          for (const name of element.classList) {
            if (name === 'todo') continue; // Legacy queued steps deliberately have no state override.
            const targets = [element, ...element.querySelectorAll('*')];
            const classRules = cssRules.filter((rule) => rule.selector.includes('.' + name));
            expect(
              targets.some((target) => matchingRules(target, classRules).length > 0),
              name,
            ).toBe(true);
          }
        }
      }
    };
    for (const [before, after] of pairs) checkPair(before!, after!);
    for (const [page, cssRules, selector] of [
      [old, oldRules, '.sub'],
      [next, nextRules, '.p-Header-sub'],
    ] as const)
      expect(
        matchingRules(page.document.querySelector(selector)!, cssRules).some((rule) =>
          hasDeclaration(rule, 'display', 'none'),
        ),
      ).toBe(true);
    const click = (page: ReturnType<typeof createPage>, selector: string) => {
      (page.document.querySelector(selector) as HTMLElement).click();
    };
    click(old, '.fig');
    click(next, '.p-FigureCard-fig');
    await ready(next, '.p-FigureCard-pinned');
    checkPair('.fig.pinned', '.p-FigureCard-fig.p-FigureCard-pinned');
    click(old, '#pole');
    click(next, '#pole');
    await ready(next, '.p-PolePanel-dc-body');
    checkPair('#dipcard .dc-body', '#dipcard .p-PolePanel-dc-body');
    checkPair('#dipcard li button', '#dipcard li button');
    click(old, '#w-next');
    click(next, '#w-next');
    await ready(next, '.p-AppPanel-dc-body');
    checkPair('#dipcard .dc-body', '#dipcard .p-AppPanel-dc-body');
    // Release history now adds one styled detail button for each version.
    checkPair('#dipcard li button', '#dipcard li button', sample.systems[0]!.releases.length);
    click(old, '#pole');
    click(next, '#pole');
    await ready(next, '.p-PolePanel-dc-body');
    const waitingGroup = '#dipcard ul:last-of-type li:nth-child(4) button';
    click(old, waitingGroup);
    click(next, waitingGroup);
    await ready(next, '.p-GroupPanel-dc-sub');
    checkPair('#dipcard > .dc-sub', '#dipcard > .p-GroupPanel-dc-sub');
    checkPair('#dipcard li button', '#dipcard li button');
    click(old, '#dipcard li button');
    click(next, '#dipcard li button');
    await ready(next, '.p-StarCard-starcard');
    // Select keyboard modality before verifying focus-visible rules after the group is replaced.
    for (const page of [old, next])
      page.document.dispatchEvent(new page.dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    (old.document.querySelector('.sc-go') as HTMLElement).focus();
    (next.document.querySelector('#star-go') as HTMLElement).focus();
    checkPair('.starcard', '.p-StarCard-starcard');
    checkPair('.starcard .needs', '.p-StarCard-starcard .p-StarCard-needs');
    checkPair('.starcard .sc-go', '.p-StarCard-starcard .p-StarCard-sc-go');
    expect(next.document.querySelector('#star-go')!.classList.contains('p-Shared-btn')).toBe(true);
  }, styleSample);
});
