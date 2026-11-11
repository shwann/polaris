import '../../../tests/support';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Markdown } from './Markdown';

it('renders the supported Markdown as React elements with safe external links', () => {
  const { container } = render(
    <Markdown
      text={
        '# 标题\n\n**粗** *斜* `代码`\n\n- 列表\n  1. 子项\n\n> 引用\n\n```js\n<a>code</a>\n```\n\n| 一 | 二 |\n| --- | --- |\n| A | B |\n\n---\n\n[外链](https://example.test) [锚点](#title) [邮件](mailto:a@example.test)'
      }
    />,
  );
  expect(screen.getByRole('heading', { name: '标题', level: 1 })).toBeTruthy();
  for (const tag of ['strong', 'em', 'ul', 'ol', 'pre', 'blockquote', 'table', 'hr'])
    expect(container.querySelector(tag)).toBeTruthy();
  for (const name of ['外链', '邮件']) {
    expect(screen.getByRole('link', { name }).getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name }).getAttribute('rel')).toBe('noopener noreferrer');
  }
  expect(screen.getByRole('link', { name: '锚点' }).hasAttribute('target')).toBe(false);
  expect(container.querySelector('pre code')?.textContent).toBe('<a>code</a>');
});
it('does not create HTML elements or dangerous anchors from input; handles empty text', () => {
  const html = '<img src=x onerror=alert(1)><script>alert(1)</script>';
  const { container, rerender } = render(<Markdown text={`${html}\n\n[危险](javascript:alert(1))`} />);
  expect(container.querySelector('img,script,a')).toBeNull();
  expect(container.textContent).toContain(html);
  expect(container.textContent).toContain('[危险](javascript:alert(1))');
  rerender(<Markdown text="" />);
  expect(container.textContent).toBe('');
});
