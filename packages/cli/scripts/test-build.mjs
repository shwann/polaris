import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function buildDeliverable() {
  const mask = process.platform === 'win32' ? undefined : process.umask(0o022);
  try {
    // Invoke Vite with Node instead of a platform-specific pnpm shell shim.
    const require = createRequire(new URL('../../web/package.json', import.meta.url));
    execFileSync(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js'), 'build'], {
      cwd: fileURLToPath(new URL('../../web/', import.meta.url)),
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } finally {
    if (mask !== undefined) process.umask(mask);
  }
}
