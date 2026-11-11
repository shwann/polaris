import { describe, expect, it } from 'vitest';
import { DATA_SLOT, embedData, readEmbedded } from '../src/index.js';

describe('embedData', () => {
  it('round-trips data through the slot, even with script-closing text', () => {
    const data = { text: '</script><!-- 北辰 \u2028' };
    const html = `<html>${DATA_SLOT}<div></div></html>`;
    const out = embedData(html, data);
    const json = /<script id="polaris-data" type="application\/json">(.*?)<\/script>/s.exec(out)![1];
    expect(json).not.toContain('</script');
    expect(readEmbedded(json)).toEqual(data);
  });

  it('refuses a page without the slot', () => {
    expect(() => embedData('<html></html>', {})).toThrow();
  });

  it('treats an empty slot as no data', () => {
    expect(readEmbedded('')).toBeUndefined();
  });
});
