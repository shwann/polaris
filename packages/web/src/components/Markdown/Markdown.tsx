import { createElement, type ReactNode } from 'react';
import type { Inline, MarkdownNode } from '../../domain/markdown';
import { parseMarkdown } from '../../domain/markdown';
import styles from './Markdown.module.css';

function inlines(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === 'text') return node.text;
    if (node.type === 'code') return <code key={i}>{node.text}</code>;
    if (node.type === 'link')
      return (
        <a key={i} href={node.href} target={node.href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer">
          {inlines(node.children)}
        </a>
      );
    return createElement(node.type, { key: i }, inlines(node.children));
  });
}
function blocks(nodes: MarkdownNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'paragraph':
        return <p key={i}>{inlines(node.children)}</p>;
      case 'heading':
        return createElement(`h${node.level}`, { key: i }, inlines(node.children));
      case 'rule':
        return <hr key={i} />;
      case 'code':
        return (
          <pre key={i}>
            <code>{node.text}</code>
          </pre>
        );
      case 'quote':
        return <blockquote key={i}>{blocks(node.children)}</blockquote>;
      case 'list':
        return createElement(
          node.ordered ? 'ol' : 'ul',
          { key: i, start: node.ordered ? node.start : undefined },
          node.items.map((item, j) => <li key={j}>{blocks(item)}</li>),
        );
      case 'table':
        return (
          <div key={i} className={styles.table}>
            <table>
              <thead>
                <tr>
                  {node.header.map((cell, j) => (
                    <th key={j}>{inlines(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.rows.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, k) => (
                      <td key={k}>{inlines(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}
export function Markdown({ text }: { text: string }) {
  return <div className={styles.markdown}>{blocks(parseMarkdown(text))}</div>;
}
