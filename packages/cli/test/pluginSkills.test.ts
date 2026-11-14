import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('plugin skill Markdown provides a root fallback and never hardcodes the Claude actor', () => {
  const root = fileURLToPath(new URL('../../../plugin/skills/', import.meta.url));
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((file) => file.endsWith('.md'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    if (content.includes('${CLAUDE_PLUGIN_ROOT}')) {
      expect(content, file).toContain('插件根目录回退');
      expect(content, file).toContain('往上两级');
    }
    expect(content, file).not.toMatch(/--actor\s+claude\b/);
  }
});
