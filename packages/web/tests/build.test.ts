// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { DATA_SLOT, embedData } from '@polaris/core';
import { finalizeHtml, GENERATED } from '../vite/emitAsset';
import { devProxy } from '../vite/devProxy';
import { sample } from './fixtures/sample';
const path = 'plugin/assets/index.html';
describe('single-file deliverable', () => {
  it('starts with the required metadata and keeps the exact mirror slot', () => {
    const html = readFileSync(path, 'utf8');
    expect(
      html.startsWith(
        GENERATED + '<title>北辰 · 研发总览</title>\n<meta name="claude:viewport-fit-sides" content="cover">',
      ),
    ).toBe(true);
    expect(html.split(DATA_SLOT)).toHaveLength(2);
    expect(embedData(html, sample)).toContain('"schema":1');
  });
  it('contains only inline JavaScript and CSS, preserves Google Fonts and stays below 512KB', () => {
    const html = readFileSync(path, 'utf8');
    expect(html).not.toMatch(/<script[^>]+src\s*=/);
    const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)];
    expect(styles).toHaveLength(1);
    expect(styles[0]![0]).toContain('fonts.googleapis.com');
    expect(statSync(path).size).toBeLessThanOrEqual(512 * 1024);
    expect(statSync(path).mode & 0o777).toBe(0o644);
  });
  it('rejects invalid assets and only runs the proxy in dev', () => {
    expect(() => finalizeHtml('<script src="/app.js"></script>' + DATA_SLOT)).toThrow('External JavaScript');
    expect(() => finalizeHtml('missing slot')).toThrow('DATA_SLOT');
    expect(() => finalizeHtml(DATA_SLOT + 'x'.repeat(512 * 1024))).toThrow('512KB');
    expect(devProxy().apply).toBe('serve');
  });
});
