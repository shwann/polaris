/**
 * How a mirror carries its data: the built page contains this empty JSON slot, and `polaris mirror` fills it.
 * The board reads it back with readEmbedded(). Keeping both sides here stops the CLI and the page drifting apart.
 */
export const DATA_ELEMENT_ID = 'polaris-data';
export const DATA_SLOT = `<script id="${DATA_ELEMENT_ID}" type="application/json"></script>`;

/** JSON that is safe inside a <script> element: no `</script>`, no `<!--`, no U+2028/2029 surprises. */
export function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Put the data into the page's slot. Throws when the page has no slot (an old or broken build). */
export function embedData(html: string, value: unknown): string {
  const at = html.indexOf(DATA_SLOT);
  if (at < 0) throw new Error(`页面里没有数据槽 ${DATA_SLOT}`);
  const filled = `<script id="${DATA_ELEMENT_ID}" type="application/json">${scriptSafeJson(value)}</script>`;
  return html.slice(0, at) + filled + html.slice(at + DATA_SLOT.length);
}

/** Read the slot's text back; empty or missing means “not a mirror”. */
export function readEmbedded(text: string | null | undefined): unknown {
  if (!text || !text.trim()) return undefined;
  return JSON.parse(text);
}
