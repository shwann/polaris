import { build } from 'esbuild';
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Fixed working directory: module paths baked into the bundle must not depend on where the build runs.
const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  absWorkingDir: root,
  entryPoints: [fileURLToPath(new URL('../src/main.ts', import.meta.url))],
  outfile: fileURLToPath(new URL('../../../plugin/bin/polaris.mjs', import.meta.url)),
  bundle: true,
  minifyWhitespace: true,
  platform: 'node',
  target: 'node22.13',
  format: 'esm',
  banner: { js: '#!/usr/bin/env node' },
  loader: { '.sql': 'text' },
});
if (process.platform !== 'win32') chmodSync(new URL('../../../plugin/bin/polaris.mjs', import.meta.url), 0o755);
