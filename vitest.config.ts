import { defineConfig } from 'vitest/config';
import { scopedName } from './packages/web/vite/scopedName.ts';

// One test run for the whole workspace; each package is a project with its own environment.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      { test: { name: 'core', root: 'packages/core', environment: 'node', include: ['test/**/*.test.ts'] } },
      { test: { name: 'cli', root: 'packages/cli', environment: 'node', include: ['test/**/*.test.ts'] } },
      {
        css: { modules: { generateScopedName: scopedName } },
        test: {
          name: 'web',
          globalSetup: ['../cli/scripts/test-build.mjs'],
          css: { include: /\.module\.css$/, modules: { classNameStrategy: 'scoped' } },
          root: 'packages/web',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
