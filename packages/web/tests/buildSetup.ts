import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export default function buildDeliverable() {
  const mask = process.umask(0o022);
  try {
    // Build outside Vitest's module runner, with the same production CLI as releases.
    execFileSync('pnpm', ['exec', 'vite', 'build'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } catch (error) {
    console.error('Artifact build failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    process.umask(mask);
  }
}
