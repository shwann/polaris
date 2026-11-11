export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong' | 'em'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };
export type MarkdownNode =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'heading'; level: number; children: Inline[] }
  | { type: 'code'; text: string; language: string }
  | { type: 'quote'; children: MarkdownNode[] }
  | { type: 'list'; ordered: boolean; start: number; items: MarkdownNode[][] }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] }
  | { type: 'rule' };

export function safeLink(href: string): boolean {
  return (
    !Array.from(href).some((c) => /\s/u.test(c) || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) &&
    /^(?:https?:\/\/|mailto:|#)/i.test(href)
  );
}
export function parseInline(text: string, depth = 0): Inline[] {
  if (depth > 16) return [{ type: 'text', text }];
  const nodes: Inline[] = [];
  const plain = (value: string) => {
    const last = nodes.at(-1);
    if (last?.type === 'text') last.text += value;
    else nodes.push({ type: 'text', text: value });
  };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && /[\\`*_[\]()>#|]/.test(text[i + 1] ?? '')) {
      plain(text[i + 1]!);
      i += 2;
      continue;
    }
    if (text[i] === '[') {
      const labelEnd = text.indexOf('](', i + 1);
      if (labelEnd >= 0) {
        let end = labelEnd + 2,
          balance = 1;
        for (; end < text.length; end++) {
          if (text[end] === '(') balance++;
          if (text[end] === ')' && --balance === 0) break;
        }
        if (!balance) {
          const href = text.slice(labelEnd + 2, end);
          if (safeLink(href))
            nodes.push({ type: 'link', href, children: parseInline(text.slice(i + 1, labelEnd), depth + 1) });
          else plain(text.slice(i, end + 1));
          i = end + 1;
          continue;
        }
      }
    }
    const marker = ['`', '**', '__', '*', '_'].find((m) => text.startsWith(m, i));
    if (marker) {
      const end = text.indexOf(marker, i + marker.length);
      if (end > i + marker.length) {
        const content = text.slice(i + marker.length, end);
        if (marker === '`') nodes.push({ type: 'code', text: content });
        else nodes.push({ type: marker.length === 2 ? 'strong' : 'em', children: parseInline(content, depth + 1) });
        i = end + marker.length;
        continue;
      }
    }
    plain(text[i]!);
    i++;
  }
  return nodes;
}
const listItem = (line: string) => /^( *)([-+*]|\d+\.)\s+(.*)$/.exec(line);
const fence = (line: string) => /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
const rule = (line: string) => /^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$|^\s*(?:_\s*){3,}$/.test(line);
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((v) => v.trim());
const tableDivider = (line: string) => line.includes('|') && cells(line).every((v) => /^:?-{3,}:?$/.test(v));

export function parseMarkdown(text: string, depth = 0): MarkdownNode[] {
  if (!text.trim()) return [];
  if (depth > 16) return [{ type: 'paragraph', children: [{ type: 'text', text }] }];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nodes: MarkdownNode[] = [];
  const special = (index: number) => {
    const line = lines[index] ?? '';
    return (
      !line.trim() ||
      fence(line) ||
      /^#{1,4}\s+|^\s*>/.test(line) ||
      rule(line) ||
      listItem(line) ||
      (line.includes('|') && tableDivider(lines[index + 1] ?? ''))
    );
  };
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const code = fence(line);
    if (code) {
      const content: string[] = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${code[1]![0]}{${code[1]!.length},}\\s*$`).test(lines[i]!))
        content.push(lines[i++]!);
      i++;
      nodes.push({ type: 'code', text: content.join('\n'), language: code[2]!.trim() });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      nodes.push({ type: 'heading', level: heading[1]!.length, children: parseInline(heading[2]!) });
      i++;
      continue;
    }
    if (rule(line)) {
      nodes.push({ type: 'rule' });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const content: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) content.push(lines[i++]!.replace(/^\s*> ?/, ''));
      nodes.push({ type: 'quote', children: parseMarkdown(content.join('\n'), depth + 1) });
      continue;
    }
    const first = listItem(line);
    if (first) {
      const indent = first[1]!.length,
        ordered = /\d/.test(first[2]!);
      const items: MarkdownNode[][] = [];
      while (i < lines.length) {
        const item = listItem(lines[i]!);
        if (!item || item[1]!.length !== indent || /\d/.test(item[2]!) !== ordered) break;
        const content = [item[3]!];
        i++;
        while (i < lines.length) {
          if (!lines[i]!.trim()) {
            if ((lines[i + 1]?.match(/^ */)?.[0].length ?? 0) <= indent) break;
            content.push('');
            i++;
            continue;
          }
          const spaces = lines[i]!.match(/^ */)![0].length;
          if (spaces <= indent) break;
          content.push(lines[i++]!.slice(Math.min(indent + 2, spaces)));
        }
        items.push(parseMarkdown(content.join('\n'), depth + 1));
      }
      nodes.push({ type: 'list', ordered, start: ordered ? parseInt(first[2]!) : 1, items });
      continue;
    }
    if (line.includes('|') && tableDivider(lines[i + 1] ?? '')) {
      const header = cells(line).map((c) => parseInline(c)),
        rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.trim() && lines[i]!.includes('|')) {
        const row = cells(lines[i++]!);
        rows.push(header.map((_, col) => parseInline(row[col] ?? '')));
      }
      nodes.push({ type: 'table', header, rows });
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && !special(i)) paragraph.push(lines[i++]!);
    nodes.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
  }
  return nodes;
}
