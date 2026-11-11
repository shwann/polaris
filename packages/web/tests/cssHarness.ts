import { createRequire } from 'node:module';

interface Declaration {
  type: string;
  prop: string;
  value: string;
}
export interface Rule {
  selector: string;
  selectors: string[];
  nodes: Declaration[];
  parent?: { type: string; name?: string; params?: string };
}
// Use Vite's installed CSS parser, without introducing another dependency.
const { parse } = createRequire(import.meta.resolve('vite'))('postcss') as {
  parse(css: string): { walkRules(visitor: (rule: Rule) => void): void };
};
export function rules(css: string) {
  const result: Rule[] = [];
  parse(css).walkRules((rule) => {
    if (rule.parent?.name !== 'keyframes') result.push(rule);
  });
  return result;
}
export const inlineCss = (html: string) =>
  [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
export const hasDeclaration = (rule: Rule, property: string, value: string) =>
  rule.nodes.some((node) => node.type === 'decl' && node.prop === property && node.value === value);
export function matchingRules(element: Element, cssRules: Rule[]) {
  return cssRules.filter((rule) =>
    rule.selectors.some((selector) => element.matches(selector.replace(/::[\w-]+/g, ''))),
  );
}
