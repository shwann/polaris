import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DATA_SLOT } from '../../core/src/embed.ts';
import type { Plugin } from 'vite';
export const GENERATED = '<!-- 由 packages/web 构建生成，不要手改 -->\n';
export function finalizeHtml(source: string) {
  const title = '<title>北辰 · 研发总览</title>',
    viewport = '<meta name="claude:viewport-fit-sides" content="cover">';
  // Singlefile may prepend styles; the Artifact metadata must remain first.
  const body = source
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="claude:viewport-fit-sides"[^>]*>/, '')
    .replace(/<meta\s+charset="[^"]*"[^>]*>/i, '')
    .trimStart();
  const html = GENERATED + title + '\n' + viewport + '\n<meta charset="UTF-8">\n' + body;
  if (!html.includes(DATA_SLOT)) throw new Error('Core DATA_SLOT must survive verbatim');
  if (Buffer.byteLength(html) > 512 * 1024) throw new Error('HTML exceeds 512KB');
  const withoutFonts = html.replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g, '');
  if (/<script[^>]+src\s*=/.test(html) || /<link[^>]+rel=["']stylesheet["']/.test(withoutFonts))
    throw new Error('External JavaScript or CSS in single-file output');
  return html;
}
export function emitAsset(): Plugin {
  return {
    name: 'polaris-emit-asset',
    apply: 'build',
    enforce: 'post',
    async writeBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') throw new Error('Single-file HTML is missing');
      const html = finalizeHtml(String(entry.source)),
        directory = fileURLToPath(new URL('../../../plugin/assets/', import.meta.url));
      await mkdir(directory, { recursive: true });
      await writeFile(directory + 'index.html', html, { mode: 0o644 });
    },
  };
}
