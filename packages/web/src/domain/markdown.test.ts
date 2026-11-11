import { expect, it } from 'vitest';
import { parseInline, parseMarkdown, safeLink } from './markdown';

it('parses four heading levels, paragraphs and an empty body', () => {
  expect(parseMarkdown('  \n')).toEqual([]);
  expect(parseMarkdown('')).toEqual([]);
  expect(parseMarkdown('# 一\n## 二\n### 三\n#### 四').map((n) => n.type === 'heading' && n.level)).toEqual([
    1, 2, 3, 4,
  ]);
  expect(parseMarkdown('第一行\n第二行\n\n第二段')).toEqual([
    { type: 'paragraph', children: [{ type: 'text', text: '第一行\n第二行' }] },
    { type: 'paragraph', children: [{ type: 'text', text: '第二段' }] },
  ]);
});
it('parses inline strong, emphasis, code, escapes and links', () => {
  expect(parseInline('**粗** *斜* `代码`')).toEqual([
    { type: 'strong', children: [{ type: 'text', text: '粗' }] },
    { type: 'text', text: ' ' },
    { type: 'em', children: [{ type: 'text', text: '斜' }] },
    { type: 'text', text: ' ' },
    { type: 'code', text: '代码' },
  ]);
  expect(parseInline('__粗__ _斜_').map((n) => n.type)).toEqual(['strong', 'text', 'em']);
  expect(parseInline('\\*普通\\*')).toEqual([{ type: 'text', text: '*普通*' }]);
  expect(parseInline('[**文字**](https://example.test/a(b))')[0]).toMatchObject({
    type: 'link',
    href: 'https://example.test/a(b)',
    children: [{ type: 'strong' }],
  });
});
it('parses unordered, ordered and mixed nested lists', () => {
  const list = parseMarkdown('- 第一项\n  1. 子项\n  2. 第二子项\n- 第二项')[0];
  expect(list).toMatchObject({
    type: 'list',
    ordered: false,
    items: [
      [{ type: 'paragraph' }, { type: 'list', ordered: true, start: 1, items: expect.any(Array) }],
      [{ type: 'paragraph' }],
    ],
  });
  expect(parseMarkdown('3. 第三\n4. 第四')[0]).toMatchObject({
    type: 'list',
    ordered: true,
    start: 3,
    items: expect.any(Array),
  });
});
it('parses fenced code verbatim, quote, table and rules', () => {
  expect(parseMarkdown('```ts\n<a>**x**</a>\n```')[0]).toEqual({ type: 'code', language: 'ts', text: '<a>**x**</a>' });
  expect(parseMarkdown('~~~\nx\n~~~')[0]).toMatchObject({ type: 'code', text: 'x' });
  expect(parseMarkdown('> 引用\n> **粗体**')[0]).toMatchObject({ type: 'quote', children: [{ type: 'paragraph' }] });
  expect(parseMarkdown('| 名称 | 值 |\n| :--- | ---: |\n| A | **B** |')[0]).toMatchObject({
    type: 'table',
    header: [[{ type: 'text', text: '名称' }], [{ type: 'text', text: '值' }]],
    rows: [[[{ type: 'text', text: 'A' }], [{ type: 'strong' }]]],
  });
  for (const text of ['---', '***', '___', '- - -']) expect(parseMarkdown(text)).toEqual([{ type: 'rule' }]);
});
it.each([
  'javascript:alert(1)',
  'data:text/html,evil',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  '//evil.test',
  '/local',
  'java\tscript:alert(1)',
  'https://good.test\u0000evil',
])('keeps disallowed links as literal text: %s', (href) => {
  const text = `[点击](${href})`;
  expect(safeLink(href)).toBe(false);
  expect(parseInline(text)).toEqual([{ type: 'text', text }]);
});
it.each(['http://example.test', 'https://example.test', 'mailto:a@example.test', '#title'])('allows %s', (href) => {
  expect(parseInline(`[文字](${href})`)[0]).toMatchObject({ type: 'link', href });
});
it('treats HTML as text and tolerates unfinished markup and code fences', () => {
  const text = '<script>alert(1)</script><img src=x onerror=alert(1)>';
  expect(parseMarkdown(text)).toEqual([{ type: 'paragraph', children: [{ type: 'text', text }] }]);
  expect(parseMarkdown('```\nunclosed')[0]).toMatchObject({ type: 'code', text: 'unclosed' });
  expect(parseInline('[unfinished](')).toEqual([{ type: 'text', text: '[unfinished](' }]);
});
